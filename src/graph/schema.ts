import { z } from 'zod/v4';
import { MessagesZodMeta } from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import { type BaseMessage } from '@langchain/core/messages';
import { ResourceSchema } from '../rag/index.js';

export const StepType = {
  RESEARCH: 'research',
  PROCESSING: 'processing',
} as const;

export const StepTypeSchema = z.enum([StepType.RESEARCH, StepType.PROCESSING]);
export type StepType = z.infer<typeof StepTypeSchema>;

export const StepSchema = z.object({
  need_search: z.boolean().describe('Must be explicitly set for each step'),
  title: z.string(),
  description: z.string().describe('Specify exactly what data to collect'),
  step_type: StepTypeSchema.describe('Indicates the nature of the step'),
  execution_res: z
    .union([z.string(), z.null()])
    .default(null)
    .describe('The Step execution result'),
});

export type Step = z.infer<typeof StepSchema>;

export const PlanSchema = z.object({
  locale: z
    .string()
    .describe("e.g. 'en-US' or 'zh-CN', based on the user's language"),
  has_enough_context: z.boolean(),
  thought: z.string().default('').describe('Thinking process for the plan'),
  title: z.string(),
  steps: z
    .array(StepSchema)
    .default([])
    .describe('Research & Processing steps to get more context'),
});

export type Plan = z.infer<typeof PlanSchema>;

export const PlanSchemaExample: Plan = {
  has_enough_context: false,
  thought:
    'To understand the current market trends in AI, we need to gather comprehensive information.',
  title: 'AI Market Research Plan',
  locale: 'en-US',
  steps: [
    {
      need_search: true,
      title: 'Current AI Market Analysis',
      description:
        'Collect data on market size, growth rates, major players, and investment trends in AI sector.',
      step_type: 'research',
      execution_res: null,
    },
  ],
};

export const StateSchema = z.object({
  messages: z
    .array(z.custom<BaseMessage>())
    .register(registry, MessagesZodMeta),

  locale: z.string().default('en-US'),
  research_topic: z.string().default(''),
  observations: z.array(z.string()).default([]),
  resources: z.array(ResourceSchema).default([]),
  plan_iterations: z.number().int().default(0),

  // current_plan 可以是 Plan 对象或字符串（如错误信息）
  current_plan: z.union([PlanSchema, z.string(), z.null()]).default(null),

  final_report: z.string().default(''),
  auto_accepted_plan: z.boolean().default(false),
  enable_background_investigation: z.boolean().default(true),
  background_investigation_results: z
    .union([z.string(), z.null()])
    .default(null),
});

export type State = z.infer<typeof StateSchema>;

export const ReportStyle = {
  ACADEMIC: 'academic',
  POPULAR_SCIENCE: 'popular_science',
  NEWS: 'news',
  SOCIAL_MEDIA: 'social_media',
  STRATEGIC_INVESTMENT: 'strategic_investment',
} as const;

export type ReportStyleType = (typeof ReportStyle)[keyof typeof ReportStyle];

export const ReportStyleSchema = z.enum(Object.values(ReportStyle));
