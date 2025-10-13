import 'dotenv/config';
import { vlm } from './llms/llm.js';
import { HumanMessage } from '@langchain/core/messages';
import { demoGraph } from './graph/graph.js';
import { printMsg } from './utils/utils.js';

async function main() {
  const result = await demoGraph.invoke({
    messages: [new HumanMessage('计算12*(9+5/7)-2*6=?')],
  });

  for (const message of result.messages) {
    printMsg(message);
  }
}

async function visual() {
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

main();
