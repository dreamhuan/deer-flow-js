import type { RunnableConfig, Runnable } from '@langchain/core/runnables';
import { Command } from '@langchain/langgraph';
import { HumanMessage } from 'langchain';
import type { StructuredTool } from 'langchain/tools';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { from_runnable_config, calcToken } from '../../utils/utils.js';
import type { State, Step } from '../schema.js';
import { getLogger } from '../../utils/logger.js';
import { createAgent } from '../agent.js';

const logger = getLogger(true);

/**
 * MCP工具注入
 */
export async function setup_and_execute_agent_step(
  state: State,
  config: RunnableConfig,
  agentType: 'researcher' | 'coder',
  defaultTools: StructuredTool[],
) {
  const configurable = from_runnable_config(config);
  const mcpServers: Record<string, any> = {};
  const enabledTools: Record<string, string> = {};

  // 提取适用于当前 agent 的 MCP 服务器配置
  if (configurable.mcp_settings?.servers) {
    for (const [serverName, serverConf] of Object.entries(
      configurable.mcp_settings.servers,
    )) {
      const serverConfig = serverConf as any;
      if (
        Array.isArray(serverConfig.enabled_tools) &&
        Array.isArray(serverConfig.add_to_agents) &&
        serverConfig.add_to_agents.includes(agentType)
      ) {
        // 仅保留 MCP 客户端需要的字段
        mcpServers[serverName] = {
          transport: serverConfig.transport,
          command: serverConfig.command,
          args: serverConfig.args,
          url: serverConfig.url,
          env: serverConfig.env,
          headers: serverConfig.headers,
        };

        for (const toolName of serverConfig.enabled_tools) {
          enabledTools[toolName] = serverName;
        }
      }
    }
  }

  // 构建工具列表
  const loadedTools = [...defaultTools];

  if (Object.keys(mcpServers).length > 0) {
    const client = new MultiServerMCPClient(mcpServers);
    const allTools = await client.getTools();

    for (const tool of allTools) {
      if (tool.name in enabledTools) {
        tool.description = `Powered by '${enabledTools[tool.name]}'.\n${tool.description}`;
        loadedTools.push(tool);
      }
    }
  }

  // TODO：上下文压缩
  const agent = createAgent(agentType, agentType, loadedTools, agentType);

  return execute_agent_step(state, agent, agentType);
}

/**
 * agent执行
 */
export async function execute_agent_step(
  state: State,
  agent: Runnable,
  agentName: string,
) {
  const currentPlan = state.current_plan;
  if (!currentPlan) {
    logger.warn('No current plan found');
    return new Command({ goto: 'research_team' });
  }

  const planTitle = currentPlan.title;
  const observations = state.observations ?? [];

  // 找到第一个未执行的步骤
  let currentStep: Step | null = null;
  const completedSteps: Step[] = [];

  for (const step of currentPlan.steps) {
    if (!step.execution_res) {
      currentStep = step;
      break;
    } else {
      completedSteps.push(step);
    }
  }

  if (!currentStep) {
    logger.warn('No unexecuted step found');
    return new Command({ goto: 'research_team' });
  }

  logger.info(`Executing step: ${currentStep.title}, agent: ${agentName}`);

  // 构建已完成步骤信息
  let completedStepsInfo = '';
  if (completedSteps.length > 0) {
    completedStepsInfo = '# Completed Research Steps\n\n';
    completedSteps.forEach((step, i) => {
      completedStepsInfo += `## Completed Step ${i + 1}: ${step.title}\n\n`;
      completedStepsInfo += `<finding>\n${step.execution_res}\n</finding>\n\n`;
    });
  }

  // 构建 agent 输入
  const agentInput = {
    messages: [
      new HumanMessage(
        `# Research Topic\n\n${planTitle}\n\n${completedStepsInfo}# Current Step\n\n## Title\n\n${currentStep.title}\n\n## Description\n\n${currentStep.description}\n\n## Locale\n\n${state.locale ?? 'en-US'}`,
      ),
    ],
  };

  // 为 researcher 添加资源提示
  if (agentName === 'researcher') {
    if (state.resources && state.resources.length > 0) {
      let resourcesInfo =
        '**The user mentioned the following resource files:**\n\n';
      for (const resource of state.resources) {
        resourcesInfo += `- ${resource.title} (${resource.description})\n`;
      }
      agentInput.messages.push(
        new HumanMessage(
          resourcesInfo +
            '\n\nYou MUST use the **local_search_tool** to retrieve the information from the resource files.',
        ),
      );
    }

    agentInput.messages.push(
      new HumanMessage({
        name: 'system',
        content:
          'IMPORTANT: DO NOT include inline citations in the text. Instead, track all sources and include a References section at the end using link reference format. Include an empty line between each citation for better readability. Use this format for each reference:\n- [Source Title](URL)\n\n- [Another Source](URL)',
      }),
    );
  }

  // TODO:递归限制
  const recursionLimit = 25;

  logger.debug('Agent input:', agentInput);

  const { totalTokensRef, callbacks } = calcToken();
  // 调用 agent
  const result = await agent.invoke(agentInput, { recursionLimit, callbacks });
  logger.info('total_tokens', totalTokensRef.current);
  const total_tokens = (state.total_tokens || 0) + totalTokensRef.current;
  // 提取响应内容
  const responseContent =
    result.messages?.[result.messages.length - 1]?.content ?? '';

  logger.debug(
    `${agentName.charAt(0).toUpperCase() + agentName.slice(1)} full response:\n`,
    responseContent,
  );

  // 更新当前步骤结果
  currentStep.execution_res = responseContent;
  logger.info(
    `Step '${currentStep.title}' execution completed by ${agentName}`,
  );

  // 返回更新和跳转
  return new Command({
    update: {
      messages: [
        new HumanMessage({
          content: responseContent,
          name: agentName,
        }),
      ],
      observations: [...observations, responseContent],
      total_tokens,
    },
    goto: 'research_team',
  });
}
