import type { State } from '../schema.js';

/**
 * 只是作为循环的一个承接结点，无内容
 */
export function research_team_node(state: State) {
  console.log('========== inner research_team_node ==========');
  return state;
}
