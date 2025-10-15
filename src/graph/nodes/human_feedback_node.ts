import { Command, interrupt } from '@langchain/langgraph';
import type { State } from '../schema.js';
import { HumanMessage } from 'langchain';
import { getLogger } from '../../utils/logger.js';

const logger = getLogger(true);
/**
 * “人在环路”
 * 用户对于计划做出确认，默认是自动确认的
 * 确认完毕触发research，否则编辑后重新触发plan
 */
export function human_feedback_node(state: State) {
  logger.info('========== inner human_feedback_node ==========');
  const current_plan = state.current_plan;
  const auto_accepted_plan = state.auto_accepted_plan;

  if (!auto_accepted_plan) {
    const feedback: string = interrupt('Please Review the Plan.');

    if (feedback.toUpperCase().startsWith('[EDIT_PLAN]')) {
      return new Command({
        update: {
          messages: [new HumanMessage({ content: feedback, name: 'feedback' })],
        },
        goto: 'planner',
      });
    } else if (feedback.toUpperCase().startsWith('[ACCEPTED]')) {
      logger.info('Plan is accepted by user.');
    } else {
      throw TypeError(`Interrupt value of ${feedback} is not supported.`);
    }
  }

  let plan_iterations = state.plan_iterations || 0;
  plan_iterations += 1;

  return new Command({
    update: {
      current_plan: current_plan,
      plan_iterations: plan_iterations,
      locale: current_plan?.locale,
    },
    goto: 'research_team',
  });
}
