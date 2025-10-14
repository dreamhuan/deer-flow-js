import { z } from 'zod/v4';
import {
  StateGraph,
  START,
  END,
  MessagesZodMeta,
  Command,
} from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import { llm, llmWithTools } from '../llms/llm.js';
import { tools, toolsByName } from '../tools/tools.js';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import type { StructuredTool } from 'langchain/tools';
import { apply_prompt_template } from '../prompts/index.js';
import type { State, Step } from './schema.js';
import type { RunnableConfig, Runnable } from '@langchain/core/runnables';
import { from_runnable_config } from '../utils/utils.js';

const MessagesState = z.object({
  messages: z
    .array(z.custom<BaseMessage>())
    .register(registry, MessagesZodMeta),
});

async function llmCall(state: z.infer<typeof MessagesState>) {
  return {
    messages: await llmWithTools.invoke([
      new SystemMessage(
        'You are a helpful assistant tasked with performing arithmetic on a set of inputs.',
      ),
      ...state.messages,
    ]),
  };
}

async function toolNode(state: z.infer<typeof MessagesState>) {
  const lastMessage = state.messages.at(-1);

  if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
    return { messages: [] };
  }

  const result: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    const observation = await tool!.invoke(toolCall);
    result.push(observation);
  }

  return { messages: result };
}

async function toolsCondition(state: z.infer<typeof MessagesState>) {
  const lastMessage = state.messages.at(-1);
  if (lastMessage == null || !AIMessage.isInstance(lastMessage)) return END;

  if (lastMessage.tool_calls?.length) {
    return 'toolNode';
  }

  return END;
}

export const myAgent = new StateGraph(MessagesState)
  .addNode('llmCall', llmCall)
  .addNode('toolNode', toolNode)
  .addEdge(START, 'llmCall')
  .addConditionalEdges('llmCall', toolsCondition, ['toolNode', END])
  .addEdge('toolNode', 'llmCall')
  .compile();

export const agent = createReactAgent({ llm, tools });

export const createAgent = (
  agent_name: string,
  agent_type: string,
  tools: Array<StructuredTool>,
  prompt_name: string,
) =>
  createReactAgent({
    name: agent_name,
    llm,
    tools,
    prompt: (state) => apply_prompt_template(prompt_name, state),
  });

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
  // if (configurable.mcp_settings?.servers) {
  //   for (const [serverName, serverConfig] of Object.entries(
  //     configurable.mcp_settings.servers,
  //   )) {
  //     if (
  //       Array.isArray(serverConfig.enabled_tools) &&
  //       Array.isArray(serverConfig.add_to_agents) &&
  //       serverConfig.add_to_agents.includes(agentType)
  //     ) {
  //       // 仅保留 MCP 客户端需要的字段
  //       mcpServers[serverName] = {
  //         transport: serverConfig.transport,
  //         command: serverConfig.command,
  //         args: serverConfig.args,
  //         url: serverConfig.url,
  //         env: serverConfig.env,
  //         headers: serverConfig.headers,
  //       };

  //       for (const toolName of serverConfig.enabled_tools) {
  //         enabledTools[toolName] = serverName;
  //       }
  //     }
  //   }
  // }

  // 构建工具列表
  const loadedTools = [...defaultTools];

  // if (Object.keys(mcpServers).length > 0) {
  //   const client = new MultiServerMCPClient(mcpServers);
  //   const allTools = await client.getTools();

  //   for (const tool of allTools) {
  //     if (tool.name in enabledTools) {
  //       tool.description = `Powered by '${enabledTools[tool.name]}'.\n${tool.description}`;
  //       loadedTools.push(tool);
  //     }
  //   }
  // }

  // TODO：上下文压缩
  const agent = createAgent(agentType, agentType, loadedTools, agentType);

  return execute_agent_step(state, agent, agentType);
}

export async function execute_agent_step(
  state: State,
  agent: Runnable,
  agentName: string,
) {
  const currentPlan = state.current_plan;
  if (!currentPlan) {
    console.warn('No current plan found');
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
    console.warn('No unexecuted step found');
    return new Command({ goto: 'research_team' });
  }

  console.info(`Executing step: ${currentStep.title}, agent: ${agentName}`);

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

  console.info('Agent input:', agentInput);

  // 调用 agent
  const result = await agent.invoke(agentInput, { recursionLimit });

  // 提取响应内容
  const responseContent =
    result.messages?.[result.messages.length - 1]?.content ?? '';

  console.debug(
    `${agentName.charAt(0).toUpperCase() + agentName.slice(1)} full response:\n`,
    responseContent,
  );

  // 更新当前步骤结果
  currentStep.execution_res = responseContent;
  console.info(
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
    },
    goto: 'research_team',
  });
}
