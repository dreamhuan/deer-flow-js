import { HumanMessage } from '@langchain/core/messages';
import { agent } from './graph.js';
import { printMsg } from './utils.js';

async function main() {
  const result = await agent.invoke({
    messages: [new HumanMessage('计算12*(9+5/7)-2*6=?')],
  });

  for (const message of result.messages) {
    printMsg(message);
  }
}

main();
