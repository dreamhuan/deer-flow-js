import {
  AIMessage,
  type BaseMessage,
  type MessageStructure,
  type MessageType,
} from '@langchain/core/messages';
import type { ToolCall } from '@langchain/core/messages/tool';

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
