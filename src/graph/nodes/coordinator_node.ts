import { Command, END } from '@langchain/langgraph';
import { llm } from '../../llms/llm.js';
import { apply_prompt_template } from '../../prompts/index.js';
import { handoff_to_planner } from '../../tools/handoff_to_planner.js';
import type { State } from '../schema.js';
import { HumanMessage } from 'langchain';

/**
 * 协调员是首先面对用户的结点，协调员的提示词定义了它的行为逻辑，
 * 对于大多数的问题，调用一个“handoff_to_planner”空函数，把主题和语言作为参数传入（具体细节自行查看提示词），
 * 这个节点会促使llm发起一个tool_call并拿到参数，本质上是做了一个简单的自然语言信息提取。因为这个call不会调用，所以函数体为空。
 * 根据topic做后续操作。
 */
export async function coordinator_node(state: State) {
  console.log('========== inner coordinator_node ==========');
  const messages = apply_prompt_template('coordinator', state);
  const response = await llm.bindTools([handoff_to_planner]).invoke(messages);

  console.log('Current state', state);
  console.log('Response.content', response.content);
  console.log('Response.tool_calls', response.tool_calls);

  let locale = state.locale || 'en-US';
  let research_topic = state.research_topic || '';

  let next = END;
  if (response.tool_calls?.length) {
    next = 'planner';
    if (state.enable_background_investigation) {
      next = 'background_investigator';
    }
    // 从tool_calls提取主题和语言
    for (const tool_call of response.tool_calls) {
      if (tool_call.name !== 'handoff_to_planner') {
        continue;
      }
      if (tool_call.args.locale && tool_call.args.research_topic) {
        locale = tool_call.args.locale as string;
        research_topic = tool_call.args.research_topic as string;
        break;
      }
    }
  } else {
    console.warn(
      'Coordinator response contains no tool calls. Terminating workflow execution.',
    );
  }

  // 如果回复有content，则加入消息列表
  if (response.content) {
    messages.push(
      new HumanMessage({
        content: response.content,
        name: 'coordinator',
      }),
    );
  }

  return new Command({
    update: {
      messages: messages,
      locale: locale,
      research_topic: research_topic,
      // resources: configurable.resources,
    },
    goto: next,
  });
}
