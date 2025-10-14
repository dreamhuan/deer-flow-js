import type { RunnableConfig } from '@langchain/core/runnables';
import { from_runnable_config } from '../../utils/utils.js';
import type { State } from '../schema.js';
import { tavilyCrawlTool, tavilySearchTool } from '../../tools/tools.js';
import { get_retriever_tool } from '../../tools/get_retriever_tool.js';
import { setup_and_execute_agent_step } from '../agent.js';

/**
 * 制定完计划开始搜索
 */
export async function researcher_node(state: State, config: RunnableConfig) {
  console.log('========== inner researcher_node ==========');

  const configurable = from_runnable_config(config);
  const tools = [tavilySearchTool, tavilyCrawlTool];

  const retriever_tool = get_retriever_tool(state.resources || []);
  if (retriever_tool) {
    tools.unshift(retriever_tool);
  }
  console.log(`Researcher tools: ${tools}`);

  return await setup_and_execute_agent_step(state, config, 'researcher', tools);
}
