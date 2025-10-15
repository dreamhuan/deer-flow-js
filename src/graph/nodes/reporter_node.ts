import type { RunnableConfig } from '@langchain/core/runnables';
import type { State } from '../schema.js';
import { calcToken, from_runnable_config } from '../../utils/utils.js';
import { HumanMessage } from '@langchain/core/messages';
import { apply_prompt_template } from '../../prompts/index.js';
import { llm } from '../../llms/llm.js';
import fs from 'fs/promises';
import path from 'path';
import { getLogger } from '../../utils/logger.js';

const logger = getLogger(true);

/**
 * 从 Markdown 内容中提取标题
 * @param content Markdown 内容
 * @returns 提取的标题，如果没有找到则返回默认标题
 */
function extractTitleFromMarkdown(content: string): string {
  // 匹配 # 标题（一级标题）
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match?.[1]) {
    return h1Match[1].trim();
  }

  // 匹配 ## 标题（二级标题）
  const h2Match = content.match(/^##\s+(.+)$/m);
  if (h2Match?.[1]) {
    return h2Match[1].trim();
  }

  // 如果没有找到标题，返回默认标题
  return 'untitled-report';
}

/**
 * 清理文件名，移除非法字符
 * @param title 原始标题
 * @returns 清理后的文件名
 */
function sanitizeFilename(title: string): string {
  // 移除或替换文件名中的非法字符
  return (
    title
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // 移除 Windows 非法字符
      .replace(/[/]/g, '_') // 移除 Unix 非法字符
      .replace(/\s+/g, '-') // 空格替换为连字符
      .replace(/-+/g, '-') // 多个连字符合并为一个
      .replace(/^-+|-+$/g, '') // 移除开头和结尾的连字符
      .substring(0, 100) // 限制文件名长度
  );
}

/**
 * 生成报告（同时输出一份报告文件）
 */
export async function reporter_node(state: State, config: RunnableConfig) {
  logger.info('========== inner reporter_node ==========');

  const configurable = from_runnable_config(config);

  const current_plan = state.current_plan!;
  const input_ = {
    messages: [
      new HumanMessage(
        `# Research Requirements\n\n## Task\n\n${current_plan.title}\n\n## Description\n\n${current_plan.thought}`,
      ),
    ],
    locale: state.locale || 'en-US',
  };

  const invoke_messages = apply_prompt_template(
    'reporter',
    input_,
    configurable,
  );
  const observations = state.observations || [];
  invoke_messages.push(
    new HumanMessage({
      content:
        "IMPORTANT: Structure your report according to the format in the prompt. Remember to include:\n\n1. Key Points - A bulleted list of the most important findings\n2. Overview - A brief introduction to the topic\n3. Detailed Analysis - Organized into logical sections\n4. Survey Note (optional) - For more comprehensive reports\n5. Key Citations - List all references at the end\n\nFor citations, DO NOT include inline citations in the text. Instead, place all citations in the 'Key Citations' section at the end using the format: `- [Source Title](URL)`. Include an empty line between each citation for better readability.\n\nPRIORITIZE USING MARKDOWN TABLES for data presentation and comparison. Use tables whenever presenting comparative data, statistics, features, or options. Structure tables with clear headers and aligned columns. Example table format:\n\n| Feature | Description | Pros | Cons |\n|---------|-------------|------|------|\n| Feature 1 | Description 1 | Pros 1 | Cons 1 |\n| Feature 2 | Description 2 | Pros 2 | Cons 2 |",
      name: 'system',
    }),
  );

  const observation_messages = [];
  for (const observation of observations) {
    observation_messages.push(
      new HumanMessage({
        content: `Below are some observations for the research task:\n\n${observation}`,
        name: 'observation',
      }),
    );
  }

  // TODO: 上下文压缩
  invoke_messages.push(...state.messages);
  logger.debug('Current invoke messages: ', invoke_messages);

  const { totalTokensRef, callbacks } = calcToken();
  const response = await llm.invoke(invoke_messages, { callbacks });
  logger.info('total_tokens', totalTokensRef.current);
  const total_tokens = (state.total_tokens || 0) + totalTokensRef.current;

  const response_content = response.content;
  logger.debug('reporter response: \n', response_content);

  // 创建 report 目录（如果不存在）
  const reportDir = path.join(process.cwd(), 'report');
  await fs.mkdir(reportDir, { recursive: true });

  // 提取标题并生成文件名
  const title = extractTitleFromMarkdown(response_content as string);
  const sanitizedFilename = sanitizeFilename(title);
  const filePath = path.join(reportDir, `${sanitizedFilename}.md`);

  // 写入文件
  await fs.writeFile(filePath, response_content as string);
  logger.info(`Report saved to: ${filePath}`);

  return {
    final_report: response_content,
    total_tokens,
  };
}
