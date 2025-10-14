import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 工具开关
function isPythonREPLEnabled(): boolean {
  const envEnabled = process.env.ENABLE_PYTHON_REPL?.toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(envEnabled || 'false');
}

// 输入 Schema
const PythonREPLInputSchema = z.object({
  code: z
    .string()
    .describe(
      'The python code to execute to do further analysis or calculation.',
    ),
});

export type PythonREPLInput = z.infer<typeof PythonREPLInputSchema>;

// 日志装饰器
function logIO<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    console.info(`[Tool: python_repl_tool] Input:`, args[0]);
    const result = await fn(...args);
    console.info(`[Tool: python_repl_tool] Output:`, result);
    return result;
  }) as T;
}

// 工具函数
const _pythonREPLTool = logIO(
  async (input: PythonREPLInput): Promise<string> => {
    const { code } = input;

    if (!isPythonREPLEnabled()) {
      const errorMsg =
        'Python REPL tool is disabled. Please enable it in environment configuration.';
      console.warn(errorMsg);
      return `Tool disabled: ${errorMsg}`;
    }

    if (typeof code !== 'string') {
      const errorMsg = `Invalid input: code must be a string, got ${typeof code}`;
      console.error(errorMsg);
      return `Error executing code:\n\`\`\`python\n${code}\n\`\`\`\nError: ${errorMsg}`;
    }

    console.info('Executing Python code');
    try {
      // 使用 python3 -c 执行代码
      const { stdout, stderr } = await execAsync(
        `python3 -c ${JSON.stringify(code)}`,
        {
          timeout: 10000, // 10秒超时
        },
      );

      const result = stderr ? stderr : stdout;

      // 检查是否包含错误
      if (
        result.toLowerCase().includes('error') ||
        result.toLowerCase().includes('exception')
      ) {
        console.error(result);
        return `Error executing code:\n\`\`\`python\n${code}\n\`\`\`\nError: ${result}`;
      }

      console.info('Code execution successful');
      return `Successfully executed:\n\`\`\`python\n${code}\n\`\`\`\nStdout: ${result}`;
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error('Python execution error:', errorMsg);
      return `Error executing code:\n\`\`\`python\n${code}\n\`\`\`\nError: ${errorMsg}`;
    }
  },
);

// 导出为 LangChain Tool
export const python_repl_tool = tool(_pythonREPLTool, {
  name: 'python_repl_tool',
  description:
    'Use this to execute python code and do data analysis or calculation. If you want to see the output of a value, you should print it out with `print(...)`. This is visible to the user.',
  schema: PythonREPLInputSchema,
});
