import { AIMessage, HumanMessage } from 'langchain';
import { apply_prompt_template } from '../../prompts/index.js';
import { PlanSchema, type State } from '../schema.js';
import { llm } from '../../llms/llm.js';
import { Command } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import { from_runnable_config } from '../../utils/utils.js';

export async function planner_node(state: State, config: RunnableConfig) {
  console.log('========== inner planner_node ==========');
  console.log('current state', state);

  const plan_iterations = state.plan_iterations || 0;

  const configurable = from_runnable_config(config);

  // 超过最大迭代次数，直接跳 reporter
  if (plan_iterations >= configurable.max_plan_iterations) {
    return new Command({ goto: 'reporter' });
  }

  // 构建 prompt
  const messages = apply_prompt_template('planner', state, configurable);

  // 把背景调查结果插入消息列表
  if (
    state.enable_background_investigation &&
    state.background_investigation_results
  ) {
    messages.push(
      new HumanMessage({
        content:
          'background investigation results of user query:\n' +
          state['background_investigation_results'] +
          '\n',
      }),
    );
  }

  const curr_plan = await llm.withStructuredOutput(PlanSchema).invoke(messages);
  const full_response = JSON.stringify(curr_plan);

  if (curr_plan.has_enough_context) {
    return new Command({
      update: {
        messages: [new AIMessage({ content: full_response, name: 'planner' })],
        current_plan: curr_plan,
      },
      goto: 'reporter',
    });
  }

  return new Command({
    update: {
      messages: [new AIMessage({ content: full_response, name: 'planner' })],
      current_plan: curr_plan,
    },
    goto: 'human_feedback',
  });
}
