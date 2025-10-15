import 'dotenv/config';
import { llm, vlm } from './llms/llm.js';
import { HumanMessage } from '@langchain/core/messages';
import { demoGraph } from './graph/graph.js';
import { calcToken, printMsg } from './utils/utils.js';
import z from 'zod';
import { agent } from './graph/agent.js';

async function runGraph() {
  const query = '计算12*(9+5/7)-2*6=?';
  const result = await demoGraph.invoke({
    messages: [new HumanMessage(query)],
  });

  for (const message of result.messages) {
    printMsg(message);
  }
}

async function runVisual() {
  const url =
    'https://raw.githubusercontent.com/dreamhuan/stg-game/refs/heads/master/2.png'; // 非直接下载的URL

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const buf = await res.arrayBuffer();
  const base64 = Buffer.from(buf).toString('base64');
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const base64Image = `data:${contentType};base64,${base64}`;
  console.log(base64Image);

  const msg = await vlm.invoke([
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            // url: 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg', // 可直接下载的URL
            url: base64Image,
          },
        },
        { type: 'text', text: '这是什么？' },
      ],
    },
  ]);
  console.log(msg);
}

async function llmToken() {
  const { totalTokensRef, callbacks } = calcToken();

  const res = await llm.invoke('12+21=', { callbacks });
  console.log(res);
  console.log(totalTokensRef.current);
}

async function structuredToken() {
  const { totalTokensRef, callbacks } = calcToken();
  const outSchema = z.object({
    yes: z
      .boolean()
      .describe('return true if the result is right, else return false'),
  });

  const res = await llm
    .withStructuredOutput(outSchema)
    .invoke(
      '12+21=30? Please respond with a JSON object containing a "yes" field.',
      { callbacks },
    );
  console.log(res);
  console.log(totalTokensRef.current);
}

async function agentToken() {
  const { totalTokensRef, callbacks } = calcToken();

  const res = await agent.invoke(
    {
      messages: '1123+423*123+32423/123=?',
    },
    { callbacks },
  );
  console.log(res);
  console.log(totalTokensRef.current);
}

llmToken();
