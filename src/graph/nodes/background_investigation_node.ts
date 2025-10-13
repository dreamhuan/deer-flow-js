import { tavilySearchTool } from '../../tools/tools.js';
import type { State } from '../schema.js';

/**
 * 使用TavilySearch对主题做一下背景调查
 */
export async function background_investigation_node(state: State) {
  console.log('========== inner background_investigation_node ==========');

  const query = state.research_topic;
  let background_investigation_results = '';

  const searched_content = await tavilySearchTool.invoke({
    query,
  });

  console.log('searched_content', searched_content);

  background_investigation_results = searched_content.results
    .map((elem: any) => {
      return `## ${elem['title']}\n\n${elem['content']}`;
    })
    .join('\n\n');

  return {
    background_investigation_results,
  };
}
