import { z } from 'zod/v4';
import { StateGraph, START, END, MessagesZodMeta } from '@langchain/langgraph';
import { registry } from '@langchain/langgraph/zod';
import { type BaseMessage } from '@langchain/core/messages';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
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
export function continue_to_running_research_team(
  state: State,
): 'planner' | 'researcher' | 'coder' {
  console.log('continue_to_running_research_team checking...');
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
  if (incompleteStep.step_type === StepType.RESEARCH) {
    return 'researcher';
  }
  if (incompleteStep.step_type === StepType.PROCESSING) {
    return 'coder';
  }

  return 'planner';
}

const DB_URI =
  'postgresql://postgres:abc123@localhost:5432/postgres?sslmode=disable';
const checkpointer = PostgresSaver.fromConnString(DB_URI);
await checkpointer.setup();

export const graph = new StateGraph(StateSchema)
  .addNode('coordinator', coordinator_node, {
    ends: ['background_investigator', 'planner', END],
  })
  .addNode('background_investigator', background_investigation_node)
  .addNode('planner', planner_node, {
    ends: ['reporter', 'human_feedback'],
  })
  .addNode('reporter', reporter_node)
  .addNode('research_team', research_team_node)
  .addNode('researcher', researcher_node, {
    ends: ['research_team'],
  })
  .addNode('coder', coder_node, {
    ends: ['research_team'],
  })
  .addNode('human_feedback', human_feedback_node, {
    ends: ['planner', 'research_team'],
  })

  .addEdge(START, 'coordinator')
  .addEdge('background_investigator', 'planner')
  .addConditionalEdges('research_team', continue_to_running_research_team, [
    'planner',
    'researcher',
    'coder',
  ])
  .addEdge('reporter', END)
  .compile({ checkpointer });
