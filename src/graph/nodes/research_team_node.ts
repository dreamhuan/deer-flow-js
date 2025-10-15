import type { State } from '../schema.js';
import { getLogger } from '../../utils/logger.js';

const logger = getLogger(true);
/**
 * 只是作为循环的一个承接结点，无内容
 */
export function research_team_node(state: State) {
  logger.info('========== inner research_team_node ==========');
  return state;
}
