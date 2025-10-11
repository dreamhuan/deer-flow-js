import { z } from 'zod/v4';
import { StateGraph, START, END, MessagesZodMeta } from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import { type BaseMessage } from '@langchain/core/messages';
import { agent, createAgent } from './agent.js';

// 1. 定义 StepType 枚举（字符串字面量联合）
export const StepType = z.enum(['research', 'processing']);
export type StepType = z.infer<typeof StepType>;

// 2. 定义 Step Schema
export const StepSchema = z.object({
  need_search: z.boolean().default(true),
  title: z.string(),
  description: z.string(),
  step_type: StepType,
});

export type Step = z.infer<typeof StepSchema>;

// 3. 定义 Plan Schema
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

// 4. 添加示例（Zod 本身不支持 schema-level examples，
//    但可以单独导出用于文档或测试）
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
    },
  ],
};

// 1. 定义 Resource（假设结构，可根据实际调整）
export const ResourceSchema = z.object({
  title: z.string(),
  description: z.string(),
});
export type Resource = z.infer<typeof ResourceSchema>;

// 3. 定义自定义 State Schema
export const State = z.object({
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

async function callAgent(state: z.infer<typeof State>) {
  const res = await agent.invoke({
    messages: state.messages,
  });
  return {
    messages: res.messages,
  };
}

// 路由函数：返回下一个节点名称
export function continueToRunningResearchTeam(
  state: z.infer<typeof State>,
): 'planner' | 'researcher' | 'coder' {
  const currentPlan = state.current_plan;

  // 如果没有计划或步骤为空，返回 planner
  if (!currentPlan?.steps?.length) {
    return 'planner';
  }

  // 如果所有步骤都已执行完成，返回 planner
  const allCompleted = currentPlan.steps.every(
    (step) => step.execution_res != null,
  );
  if (allCompleted) {
    return 'planner';
  }

  // 找到第一个未完成的步骤
  const incompleteStep = currentPlan.steps.find((step) => !step.execution_res);

  if (!incompleteStep) {
    return 'planner';
  }

  // 根据 step_type 路由
  if (incompleteStep.step_type === 'RESEARCH') {
    return 'researcher';
  }
  if (incompleteStep.step_type === 'PROCESSING') {
    return 'coder';
  }

  return 'planner';
}

// export const graph = new StateGraph(State)
//   .addNode('callAgent', callAgent)
//   .addEdge(START, 'callAgent')
//   .addEdge('callAgent', END)
//   .compile();

// export const graph = new StateGraph(State)
//   .add_node('coordinator', coordinator_node)
//   .add_node('background_investigator', background_investigation_node)
//   .add_node('planner', planner_node)
//   .add_node('reporter', reporter_node)
//   .add_node('research_team', research_team_node)
//   .add_node('researcher', researcher_node)
//   .add_node('coder', coder_node)
//   .add_node('human_feedback', human_feedback_node)

//   .add_edge(START, 'coordinator')
//   .add_edge('background_investigator', 'planner')
//   .add_conditional_edges('research_team', continueToRunningResearchTeam, [
//     'planner',
//     'researcher',
//     'coder',
//   ])
//   .add_edge('reporter', END)
//   .compile();
