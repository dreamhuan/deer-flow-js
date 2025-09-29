import { HumanMessage } from '@langchain/core/messages';
import { agent } from './graph.js';
import { printMsg } from './utils.js';
import prompts from 'prompts';
import ora from 'ora';
import chalk from 'chalk';

async function cli() {
  console.log(chalk.cyan('开始AI对话，输入 "q" 退出。'));

  while (true) {
    const userInput = await prompts({
      type: 'text',
      name: 'message',
      message: chalk.green('输入你的问题:'), // 用户输入的提示符
      validate: (input) => (input.trim().length > 0 ? true : '输入不能为空！'),
    });

    // 如果用户没有输入内容（例如按了 Ctrl+C），或者输入了退出命令，则结束对话
    if (
      !userInput.message ||
      ['exit', 'quit', 'q'].includes(userInput.message.toLowerCase())
    ) {
      console.log(chalk.yellow('再见'));
      break;
    }

    // 显示加载动画，提示用户AI正在思考
    const spinner = ora({
      text: chalk.blue('AI 正在思考...'),
      spinner: 'dots',
    }).start();

    try {
      const question = userInput.message;
      const result = await agent.invoke({
        messages: [new HumanMessage(question)],
      });

      // 成功获取回复后，停止加载动画并显示成功状态
      spinner.succeed(chalk.blue('AI:'));

      for (const message of result.messages) {
        printMsg(message);
      }
    } catch (error) {
      // 如果发生错误，停止加载动画并显示失败状态
      spinner.fail(chalk.red('请求失败'));
      console.error(error);
    }
  }
}

cli();
