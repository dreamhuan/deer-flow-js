import type { State } from '../schema.js';

export function coder_node(state: State) {
  console.log('========== inner coder_node ==========');

  return state;
}
