import z from 'zod/v4';
import type { Resource } from '../rag/index.js';
import { tool } from '@langchain/core/tools';

const RetrieverInputSchema = z.object({
  keywords: z.string().describe('search keywords to look up'),
});

export type RetrieverInput = z.infer<typeof RetrieverInputSchema>;

/**
 * 命令行暂时用不到RAG，但是先保留
 */
export function get_retriever_tool(resources: Resource[]) {
  if (!resources?.length) {
    return null;
  }

  console.info(`create retriever tool`);
  const retriever = buildRetriever();

  if (!retriever) {
    return null;
  }

  return tool(
    async (input: RetrieverInput) => {
      console.info('Retriever tool query:', input.keywords, { resources });

      const documents = await retriever.queryRelevantDocuments(
        input.keywords,
        resources,
      );

      if (!documents || documents.length === 0) {
        return 'No results found from the local knowledge base.';
      }

      return documents.map((doc: any) =>
        typeof doc.toJSON === 'function' ? doc.toJSON() : doc,
      );
    },
    {
      name: 'local_search_tool',
      description:
        'Useful for retrieving information from the file with `rag://` uri prefix, it should be higher priority than the web search or writing code. Input should be a search keywords.',
      schema: RetrieverInputSchema,
    },
  );
}
function buildRetriever() {
  return null as any;
}
