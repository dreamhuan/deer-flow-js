import type { RunnableConfig } from '@langchain/core/runnables';
import { setup_and_execute_agent_step } from './common.js';
import type { State } from '../schema.js';
import { python_repl_tool } from '../../tools/python_repl_tool.js';
import { getLogger } from '../../utils/logger.js';

const logger = getLogger(true);
/**
 * 对于某些特定内容支持python代码分析结果
 */
export async function coder_node(state: State, config: RunnableConfig) {
  logger.info('========== inner coder_node ==========');

  return await setup_and_execute_agent_step(state, config, 'coder', [
    python_repl_tool,
  ]);
}
