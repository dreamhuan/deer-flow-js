import 'dotenv/config';
import { HumanMessage } from '@langchain/core/messages';
import { graph } from './graph/graph.js';
import { printMsg } from './utils/utils.js';
import { runAgentWorkflowAsync } from './graph/workflow.js';

async function main() {
  const query = '告诉我agent和大模型有什么关系';
  // const result = await graph.invoke({
  //   messages: [new HumanMessage(query)],
  // });

  // for (const message of result.messages) {
  //   printMsg(message);
  // }

  await runAgentWorkflowAsync(query, {
    debug: true,
    maxPlanIterations: 1,
    maxStepNum: 3,
    enableBackgroundInvestigation: true,
  });
}

main();
