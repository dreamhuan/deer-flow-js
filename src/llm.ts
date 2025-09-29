import dotenv from 'dotenv';
import { z } from 'zod/v4';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { tool } from '@langchain/core/tools';

dotenv.config();

// 注意输出维度为1024维
export const embeddings = new OpenAIEmbeddings({
  model: 'BAAI/bge-m3',
  configuration: {
    baseURL: 'https://api.siliconflow.cn/v1/',
  },
});

// 开发测试使用免费模型
export const llm = new ChatOpenAI({
  model: 'Qwen/Qwen3-8B',
  // model: 'deepseek-ai/DeepSeek-V3.1',
  configuration: {
    baseURL: 'https://api.siliconflow.cn/v1/',
  },
});

// Define tools
const add = tool(({ a, b }) => a + b, {
  name: 'add',
  description: 'Add two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

const multiply = tool(({ a, b }) => a * b, {
  name: 'multiply',
  description: 'Multiply two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

const divide = tool(({ a, b }) => a / b, {
  name: 'divide',
  description: 'Divide two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

// Augment the LLM with tools
export const toolsByName = {
  [add.name]: add,
  [multiply.name]: multiply,
  [divide.name]: divide,
};
export const tools = Object.values(toolsByName);
export const llmWithTools = llm.bindTools(tools);
