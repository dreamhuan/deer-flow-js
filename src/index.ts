import 'dotenv/config';
import { runAgentWorkflowAsync } from './graph/workflow.js';

async function main() {
  const query = '介绍LLM的基本原理';

  await runAgentWorkflowAsync(query, {
    maxPlanIterations: 1,
    maxStepNum: 3,
    enableBackgroundInvestigation: true,
  });
}

main();
