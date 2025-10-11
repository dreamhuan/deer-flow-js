import { z } from 'zod/v4';
import { StateGraph, START, END, MessagesZodMeta } from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import {
  AIMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import { llm, llmWithTools } from '../llms/llm.js';
import { tools, toolsByName } from '../tools/tools.js';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import type { StructuredTool } from 'langchain/tools';
import { applyPromptTemplate } from '../prompts/index.js';

const MessagesState = z.object({
  messages: z
    .array(z.custom<BaseMessage>())
    .register(registry, MessagesZodMeta),
});

async function llmCall(state: z.infer<typeof MessagesState>) {
  return {
    messages: await llmWithTools.invoke([
      new SystemMessage(
        'You are a helpful assistant tasked with performing arithmetic on a set of inputs.',
      ),
      ...state.messages,
    ]),
  };
}

async function toolNode(state: z.infer<typeof MessagesState>) {
  const lastMessage = state.messages.at(-1);

  if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
    return { messages: [] };
  }

  const result: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    const observation = await tool!.invoke(toolCall);
    result.push(observation);
  }

  return { messages: result };
}

async function toolsCondition(state: z.infer<typeof MessagesState>) {
  const lastMessage = state.messages.at(-1);
  if (lastMessage == null || !AIMessage.isInstance(lastMessage)) return END;

  if (lastMessage.tool_calls?.length) {
    return 'toolNode';
  }

  return END;
}

export const myAgent = new StateGraph(MessagesState)
  .addNode('llmCall', llmCall)
  .addNode('toolNode', toolNode)
  .addEdge(START, 'llmCall')
  .addConditionalEdges('llmCall', toolsCondition, ['toolNode', END])
  .addEdge('toolNode', 'llmCall')
  .compile();

export const agent = createReactAgent({ llm, tools });

type LLMType = 'basic' | 'reasoning' | 'vision' | 'code';

const AGENT_LLM_MAP: Record<string, LLMType> = {
  coordinator: 'basic',
  planner: 'basic',
  researcher: 'basic',
  coder: 'basic',
  reporter: 'basic',
  podcast_script_writer: 'basic',
  ppt_composer: 'basic',
  prose_writer: 'basic',
  prompt_enhancer: 'basic',
};

export const get_llm_by_type = (llmType: LLMType) => {
  const map = {
    reasoning: 'REASONING_MODEL',
    basic: 'BASIC_MODEL',
    vision: 'VISION_MODEL',
    code: 'CODE_MODEL',
  };
  return map[llmType];
};
export const createAgent = (
  agent_name: string,
  agent_type: string,
  tools: Array<StructuredTool>,
  prompt_name: string,
) =>
  createReactAgent({
    name: agent_name,
    llm,
    tools,
    prompt: (state) => applyPromptTemplate(prompt_name, state),
  });
