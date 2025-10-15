import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { tools } from '../tools/tools.js';

// 硅基流动平台的免费embedding模型
// 注意输出维度为1024维
export const embeddings = new OpenAIEmbeddings({
  model: 'BAAI/bge-m3',
  configuration: {
    baseURL: 'https://api.siliconflow.cn/v1/',
  },
});

// 硅基流动平台的模型，DeepResearch太费token了，慎用
// export const llm = new ChatOpenAI({
//   // model: 'deepseek-ai/DeepSeek-V3.1',
//   model: 'Qwen/Qwen3-8B', // 开发测试使用免费模型
//   configuration: {
//     baseURL: 'https://api.siliconflow.cn/v1/',
//   },
// });

// 记得开启“免费额度用完即停”功能
export const llm = new ChatOpenAI({
  model: 'qwen3-max-2025-09-23',
  configuration: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: process.env.DASHSCOPE_API_KEY!,
  },
});

// 记得开启免费“额度用完即停”功能
export const vlm = new ChatOpenAI({
  model: 'qwen3-vl-plus', // 视觉模型
  // model: 'qwen3-omni-flash', // 多模态模型
  configuration: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: process.env.DASHSCOPE_API_KEY!,
  },
});

export const llmWithTools = llm.bindTools(tools);

type LLMType = 'basic' | 'reasoning' | 'vision' | 'code';

export const AGENT_LLM_MAP: Record<string, LLMType> = {
  coordinator: 'basic',
  planner: 'basic',
  researcher: 'basic',
  coder: 'basic',
  reporter: 'basic',
  podcast_script_writer: 'basic',
  ppt_composer: 'basic',
  prose_writer: 'basic',
  prompt_enhancer: 'basic',
};

export const get_llm_by_type = (llmType: LLMType) => {
  const map = {
    reasoning: 'REASONING_MODEL',
    basic: 'BASIC_MODEL',
    vision: 'VISION_MODEL',
    code: 'CODE_MODEL',
  };
  return map[llmType];
};
