import {
  AIMessage,
  type BaseMessage,
  type MessageStructure,
  type MessageType,
} from '@langchain/core/messages';
import type { ToolCall } from '@langchain/core/messages/tool';
import type { RunnableConfig } from '@langchain/core/runnables';
import z from 'zod/v4';
import { ReportStyle } from '../graph/schema.js';
import { ResourceSchema } from '../rag/index.js';

// 定义一个新类型，它是一个 AIMessage，并且 tool_calls 字段是必须存在的非空数组
// 使用 [ToolCall, ...ToolCall[]] 可以更精确地表达“至少有一个元素的数组”
type AIMessageWithToolCalls = AIMessage & {
  tool_calls: [ToolCall, ...ToolCall[]];
};

export const isToolCall = (
  message: BaseMessage<MessageStructure, MessageType>,
): message is AIMessageWithToolCalls => {
  return !!(AIMessage.isInstance(message) && message.tool_calls?.length);
};

export const printMsg = (
  message: BaseMessage<MessageStructure, MessageType>,
) => {
  const type = message.type.padEnd(5);
  let content = message.text;
  if (isToolCall(message)) {
    content =
      'tool_calls ' +
      message.tool_calls
        .map((tool) => [tool.name, JSON.stringify(tool.args)])
        .flat(1)
        .join('');
  }
  console.log(`[${type}]: ${content}`);
};

// 工具函数：从环境变量读取
function getStrEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getIntEnv(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getBoolEnv(key: string, defaultValue: boolean): boolean {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(val.toLowerCase());
}

// 1. 定义 Configuration Schema
export const ConfigurationSchema = z.object({
  resources: z.array(ResourceSchema).default([]),
  max_plan_iterations: z.number().int().default(1),
  max_step_num: z.number().int().default(3),
  max_search_results: z.number().int().default(3),
  mcp_settings: z.any().nullable().default(null),
  report_style: z.string().default(ReportStyle.ACADEMIC),
  enable_deep_thinking: z.boolean().default(false),
});

export type Configuration = z.infer<typeof ConfigurationSchema>;

// 2. 获取递归限制
export function get_recursion_limit(defaultValue: number = 25): number {
  const envValueStr = getStrEnv('AGENT_RECURSION_LIMIT', String(defaultValue));
  const parsedLimit = getIntEnv('AGENT_RECURSION_LIMIT', defaultValue);

  if (parsedLimit > 0) {
    console.info(`Recursion limit set to: ${parsedLimit}`);
    return parsedLimit;
  } else {
    console.warn(
      `AGENT_RECURSION_LIMIT value '${envValueStr}' (parsed as ${parsedLimit}) is not positive. Using default value ${defaultValue}.`,
    );
    return defaultValue;
  }
}

// 3. 从 RunnableConfig 构建 Configuration
export function from_runnable_config(
  config?: RunnableConfig | null,
): Configuration {
  const configurable = config?.configurable ?? {};

  // 获取 schema 字段名
  const fieldNames = [
    'resources',
    'max_plan_iterations',
    'max_step_num',
    'max_search_results',
    'mcp_settings',
    'report_style',
    'enable_deep_thinking',
  ];

  const values: Record<string, any> = {};
  for (const fieldName of fieldNames) {
    // 优先级：configurable > env > schema default
    const envKey = fieldName.toUpperCase();
    const fromEnv = process.env[envKey];
    const fromConfig = configurable[fieldName];

    if (fromConfig !== undefined) {
      values[fieldName] = fromConfig;
    } else if (fromEnv !== undefined) {
      // 尝试类型转换
      if (fieldName === 'enable_deep_thinking') {
        values[fieldName] = getBoolEnv(envKey, false);
      } else if (
        ['max_plan_iterations', 'max_step_num', 'max_search_results'].includes(
          fieldName,
        )
      ) {
        values[fieldName] = getIntEnv(envKey, 0);
      } else {
        values[fieldName] = fromEnv;
      }
    }
  }

  // 使用 Zod 验证并填充默认值
  return ConfigurationSchema.parse(values);
}
