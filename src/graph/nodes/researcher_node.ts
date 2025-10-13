import type { State } from '../schema.js';

/**
 * 制定完计划开始搜索
 */
export function researcher_node(state: State) {
  console.log('========== inner researcher_node ==========');
  return state;
}
