import { z } from 'zod/v4';
import { StructuredTool, tool } from '@langchain/core/tools';

// 空函数体，因为并不会调用它
export const handoff_to_planner: StructuredTool = tool(() => {}, {
  name: 'handoff_to_planner',
  description: 'Handoff to planner agent to do plan.',
  schema: z.object({
    research_topic: z
      .string()
      .describe('The topic of the research task to be handed off.'),
    locale: z
      .string()
      .describe("The user's detected language locale (e.g., en-US, zh-CN)."),
  }),
});
