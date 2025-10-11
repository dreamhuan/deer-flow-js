import { z } from 'zod/v4';
import { StateGraph, START, END, MessagesZodMeta } from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import { type BaseMessage } from '@langchain/core/messages';
import { agent } from './agent.js';

const State = z.object({
  messages: z
    .array(z.custom<BaseMessage>())
    .register(registry, MessagesZodMeta),

  research_topic: z.string().optional(),
  current_plan: z.string().optional(),
  plan_iterations: z.number().optional(),
  observations: z.array(z.string()).optional(),
  final_report: z.string().optional(),
  background_investigation_results: z.string().optional(),

  // resources: z.array(z.custom<z.infer<typeof Resource>>()),
});

async function callAgent(state: z.infer<typeof State>) {
  const res = await agent.invoke({
    messages: state.messages,
  });
  return {
    messages: res.messages,
  };
}

export const graph = new StateGraph(State)
  .addNode('callAgent', callAgent)
  .addEdge(START, 'callAgent')
  .addEdge('callAgent', END)
  .compile();
