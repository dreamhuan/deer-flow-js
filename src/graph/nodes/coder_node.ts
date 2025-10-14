import type { RunnableConfig } from '@langchain/core/runnables';
import { setup_and_execute_agent_step } from '../agent.js';
import type { State } from '../schema.js';
import { python_repl_tool } from '../../tools/python_repl_tool.js';

export async function coder_node(state: State, config: RunnableConfig) {
  console.log('========== inner coder_node ==========');

  return await setup_and_execute_agent_step(state, config, 'coder', [
    python_repl_tool,
  ]);
}
