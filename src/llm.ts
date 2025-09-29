import dotenv from 'dotenv';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { tools } from './tools.js';

dotenv.config();

// 注意输出维度为1024维
export const embeddings = new OpenAIEmbeddings({
  model: 'BAAI/bge-m3',
  configuration: {
    baseURL: 'https://api.siliconflow.cn/v1/',
  },
});

// export const llm = new ChatOpenAI({
//   // model: 'deepseek-ai/DeepSeek-V3.1',
//   model: 'Qwen/Qwen3-8B', // 开发测试使用免费模型
//   configuration: {
//     baseURL: 'https://api.siliconflow.cn/v1/',
//   },
// });

// 记得开启免费“额度用完即停”功能
export const llm = new ChatOpenAI({
  model: 'qwen3-max-2025-09-23',
  configuration: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: process.env.DASHSCOPE_API_KEY!,
  },
});

export const llmWithTools = llm.bindTools(tools);
