import 'dotenv/config';
import { HumanMessage } from '@langchain/core/messages';
import { graph } from './graph/graph.js';
import { printMsg } from './utils/utils.js';

async function main() {
  const result = await graph.invoke({
    messages: [new HumanMessage('告诉我agent和大模型有什么关系')],
  });

  // for (const message of result.messages) {
  //   printMsg(message);
  // }
}

main();
