import { tavilySearchTool } from '../../tools/tools.js';
import { getLogger } from '../../utils/logger.js';
import type { State } from '../schema.js';

const logger = getLogger(true);
/**
 * 使用TavilySearch对主题做一下背景调查
 */
export async function background_investigation_node(state: State) {
  logger.info('========== inner background_investigation_node ==========');

  const query = state.research_topic;
  let background_investigation_results = '';

  const searched_content = await tavilySearchTool.invoke({
    query,
  });

  logger.debug('searched_content', searched_content);

  background_investigation_results = searched_content.results
    .map((elem: any) => {
      return `## ${elem['title']}\n\n${elem['content']}`;
    })
    .join('\n\n');

  return {
    background_investigation_results,
  };
}
