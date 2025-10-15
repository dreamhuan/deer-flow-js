import { HumanMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import { graph } from './graph.js';
import { get_recursion_limit } from '../utils/utils.js';

let logLevel: 'INFO' | 'DEBUG' = 'INFO';

function setLogLevel(level: 'INFO' | 'DEBUG') {
  logLevel = level;
}

function log(level: 'INFO' | 'DEBUG', message: string) {
  if (level === 'DEBUG' && logLevel !== 'DEBUG') return;
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${level} - ${message}`);
}

export interface RunAgentWorkflowOptions {
  debug?: boolean;
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
    debug = false,
    maxPlanIterations = 1,
    maxStepNum = 3,
    enableBackgroundInvestigation = true,
    finishCb,
  } = options;

  if (!userInput) {
    throw new Error('Input could not be empty');
  }

  log('INFO', `Starting async workflow with user input: ${userInput}`);

  const initialState = {
    messages: [new HumanMessage(userInput)],
    auto_accepted_plan: true,
    enable_background_investigation: enableBackgroundInvestigation,
  };

  // RETRY.1 const thread_id = '';
  const thread_id = uuidv4();
  console.log('current thread_id', thread_id);

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

  let lastMessageCount = 0;

  // RETRY.2
  // let newConfig;
  // for await (const state of graph.getStateHistory(config)) {
  //   const checkpoint_id = '';
  //   if (state.config.configurable?.checkpoint_id === checkpoint_id) {
  //     newConfig = state.config;
  //     console.log(newConfig);
  //   }
  // }

  try {
    // RETRY.3
    // const stream = await graph.stream(null, config);
    // const stream = await graph.stream(null, newConfig);
    const stream = await graph.stream(initialState, config);
    finishCb?.();
    for await (const state of stream) {
      // LangGraph.js 的 stream 默认返回 { values: State, ... }
      const s = 'values' in state ? state.values : state;

      if (typeof s === 'object' && s !== null && 'messages' in s) {
        const messages = s.messages as any[];
        if (messages.length <= lastMessageCount) continue;
        lastMessageCount = messages.length;

        const lastMessage = messages[messages.length - 1];

        // 尝试调用 prettyPrint（如果存在），否则直接打印
        if (typeof lastMessage?.prettyPrint === 'function') {
          lastMessage.prettyPrint();
        } else if (lastMessage?.content) {
          console.log(lastMessage.content);
        } else {
          console.log('Message:', lastMessage);
        }
      } else {
        console.log('Output:', s);
      }
    }

    log('INFO', 'Async workflow completed successfully');
  } catch (error) {
    log('INFO', `Error in workflow: ${error}`);
    console.error('Workflow error:', error);
  }
  console.log('========================= states =========================');
  const states = [];
  for await (const state of graph.getStateHistory(config)) {
    states.push(state);
  }

  for (const state of states) {
    console.log('---');
    console.log('checkpoint_id:', state.config.configurable?.checkpoint_id);
    console.log('next:', state.next);
  }
}
