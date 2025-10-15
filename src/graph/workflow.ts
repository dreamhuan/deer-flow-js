import { HumanMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import { graph } from './graph.js';
import { get_recursion_limit } from '../utils/utils.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger(true);

export interface RunAgentWorkflowOptions {
  maxPlanIterations?: number;
  maxStepNum?: number;
  enableBackgroundInvestigation?: boolean;
  finishCb?: () => void;
}

export async function runAgentWorkflowAsync(
  userInput: string,
  options: RunAgentWorkflowOptions = {},
) {
  const {
    maxPlanIterations = 1,
    maxStepNum = 3,
    enableBackgroundInvestigation = true,
    finishCb,
  } = options;

  if (!userInput) {
    throw new Error('Input could not be empty');
  }

  logger.info(`Starting async workflow with user input: ${userInput}`);

  const initialState = {
    messages: [new HumanMessage(userInput)],
    auto_accepted_plan: true,
    enable_background_investigation: enableBackgroundInvestigation,
  };

  // RETRY.1 const thread_id = '';
  const thread_id = uuidv4();
  logger.info('current thread_id', thread_id);

  const config = {
    configurable: {
      thread_id,
      max_plan_iterations: maxPlanIterations,
      max_step_num: maxStepNum,
      mcp_settings: {
        servers: {
          'mcp-github-trending': {
            transport: 'stdio',
            command: 'uvx',
            args: ['mcp-github-trending'],
            enabled_tools: ['get_github_trending_repositories'],
            add_to_agents: ['researcher'],
          },
        },
      },
    },
    recursion_limit: get_recursion_limit(),
  };

  // RETRY.2
  // let newConfig;
  // for await (const state of graph.getStateHistory(config)) {
  //   const checkpoint_id = '';
  //   if (state.config.configurable?.checkpoint_id === checkpoint_id) {
  //     newConfig = state.config;
  //     logger.info(newConfig);
  //   }
  // }

  try {
    let finalState: any;
    // RETRY.3
    // const stream = await graph.stream(null, config);
    // const stream = await graph.stream(null, newConfig);
    const stream = await graph.stream(initialState, config);
    finishCb?.();
    for await (const state of stream) {
      // LangGraph.js 的 stream 默认返回 { values: State, ... }
      const s = 'values' in state ? state.values : state;
      finalState = s;
      logger.debug('Output:', s);
    }

    logger.info('Async workflow completed successfully');
    logger.info('Total tokens used:', finalState?.reporter?.total_tokens);
  } catch (error) {
    logger.error('Workflow error:', error);
  }
  logger.info('========================= states =========================');
  const states = [];
  for await (const state of graph.getStateHistory(config)) {
    states.push(state);
  }

  for (const state of states) {
    logger.info('---');
    logger.info('checkpoint_id:', state.config.configurable?.checkpoint_id);
    logger.info('next:', state.next);
  }
}
