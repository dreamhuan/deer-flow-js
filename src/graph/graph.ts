import { z } from 'zod/v4';
import { StateGraph, START, END, MessagesZodMeta } from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import { type BaseMessage } from '@langchain/core/messages';
import { agent, createAgent, myAgent } from './agent.js';
import { StateSchema, StepType, type State } from './schema.js';
import { coordinator_node } from './nodes/coordinator_node.js';
import { background_investigation_node } from './nodes/background_investigation_node.js';
import { coder_node } from './nodes/coder_node.js';
import { human_feedback_node } from './nodes/human_feedback_node.js';
import { planner_node } from './nodes/planner_node.js';
import { reporter_node } from './nodes/reporter_node.js';
import { research_team_node } from './nodes/research_team_node.js';
import { researcher_node } from './nodes/researcher_node.js';

async function callAgent(state: State) {
  const res = await myAgent.invoke({
    messages: state.messages,
  });
  return {
    messages: res.messages,
  };
}

export const demoGraph = new StateGraph(StateSchema)
  .addNode('callAgent', callAgent)
  .addEdge(START, 'callAgent')
  .addEdge('callAgent', END)
  .compile();

// 路由函数：返回下一个节点名称
export function continueToRunningResearchTeam(
  state: State,
): 'planner' | 'researcher' | 'coder' {
  const currentPlan = state.current_plan;

  // 如果没有计划或步骤为空，返回 planner
  if (typeof currentPlan === 'string' || !currentPlan?.steps?.length) {
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
  if (incompleteStep.step_type === StepType.RESEARCH) {
    return 'researcher';
  }
  if (incompleteStep.step_type === StepType.PROCESSING) {
    return 'coder';
  }

  return 'planner';
}

export const graph = new StateGraph(StateSchema)
  .addNode('coordinator', coordinator_node)
  // .addNode('background_investigator', background_investigation_node)
  // .addNode('planner', planner_node)
  // .addNode('reporter', reporter_node)
  // .addNode('research_team', research_team_node)
  // .addNode('researcher', researcher_node)
  // .addNode('coder', coder_node)
  // .addNode('human_feedback', human_feedback_node)

  .addEdge(START, 'coordinator')
  // .addEdge('background_investigator', 'planner')
  // .addConditionalEdges('research_team', continueToRunningResearchTeam, [
  //   'planner',
  //   'researcher',
  //   'coder',
  // ])
  // .addEdge('reporter', END)
  .compile();
