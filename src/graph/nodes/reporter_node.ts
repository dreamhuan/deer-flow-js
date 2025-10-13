import type { State } from '../schema.js';

export function reporter_node(state: State) {
  console.log('========== inner reporter_node ==========');
  return state;
}
