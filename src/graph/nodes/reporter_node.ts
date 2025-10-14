import type { RunnableConfig } from '@langchain/core/runnables';
import type { State } from '../schema.js';
import { from_runnable_config } from '../../utils/utils.js';
import { HumanMessage } from '@langchain/core/messages';
import { apply_prompt_template } from '../../prompts/index.js';
import { llm } from '../../llms/llm.js';
import fs from 'fs/promises';
export async function reporter_node(state: State, config: RunnableConfig) {
  console.log('========== inner reporter_node ==========');

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
  console.log('Current invoke messages: ', invoke_messages);

  const response = await llm.invoke(invoke_messages);
  const response_content = response.content;
  console.log('reporter response: ', response_content);

  fs.writeFile('final_report.md', response_content as string);

  return { final_report: response_content };
}
