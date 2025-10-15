/**
 * 这个目录下的prompts只用到了部分，内容完全拷贝于字节deer-flow项目
 * link: https://github.com/bytedance/deer-flow/blob/main/src/prompts/template.py
 */
import * as path from 'path';
import * as nunjucks from 'nunjucks';
import { fileURLToPath } from 'url';
import type { MessagesAnnotation } from '@langchain/langgraph';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { Configuration } from '../utils/utils.js';

// 获取当前文件目录（兼容 ESM）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置 Nunjucks 环境（类似 Jinja2）
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(__dirname), {
  autoescape: true,
  trimBlocks: true,
  lstripBlocks: true,
});

// Load and return a prompt template using Jinja2.

// Args:
//     prompt_name: Name of the prompt template file (without .md extension)

// Returns:
//     The template string with proper variable substitution syntax
export function get_prompt_template(promptName: string): string {
  try {
    return env.render(`${promptName}.md`, {});
  } catch (e: any) {
    throw new Error(`Error loading template ${promptName}: ${e.message}`);
  }
}

// Apply template variables to a prompt template and return formatted messages.

// Args:
//     prompt_name: Name of the prompt template to use
//     state: Current agent state containing variables to substitute

// Returns:
//     List of messages with the system prompt as the first message
export function apply_prompt_template(
  promptName: string,
  state: typeof MessagesAnnotation.State,
  configurable?: Configuration,
): BaseMessageLike[] {
  const now = new Date();
  const currentTime = now
    .toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    })
    .replace(/, /g, ' '); // 调整为类似 "Wed Jun 05 2025 14:30:45 GMT+0800"

  const stateVars: Record<string, any> = {
    CURRENT_TIME: currentTime,
    ...state,
    ...configurable,
  };

  try {
    const systemPrompt = env.render(`${promptName}.md`, stateVars);
    return [
      { role: 'system', content: systemPrompt },
      ...(state.messages as any),
    ];
  } catch (e: any) {
    throw new Error(`Error applying template ${promptName}: ${e.message}`);
  }
}
