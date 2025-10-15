import winston from 'winston';
import path from 'path';
import fs from 'fs';
import util from 'util';

// 日志级别类型
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// 全局配置
const config = {
  enabled: true, // 全局开关
  consoleLevel: 'info' as LogLevel, // 控制台日志级别
  fileLevel: 'debug' as LogLevel, // 文件日志级别
  logDir: path.join(process.cwd(), 'logs'),
};

// 确保日志目录存在
if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

// 全局日志器实例
let globalLogger: winston.Logger | null = null;

/**
 * 格式化多个参数为字符串
 * 类似 console.log 的行为，支持对象、数组等直接输出
 */
function formatMessage(...args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg;
      } else if (arg instanceof Error) {
        return arg.stack || arg.message || String(arg);
      } else {
        // 使用 util.inspect 保持对象结构，但限制深度避免过长
        return util.inspect(arg, {
          depth: 5,
          colors: false, // 文件日志不需要颜色
          breakLength: Infinity,
        });
      }
    })
    .join(' ');
}

/**
 * 日志器接口
 */
export interface Logger {
  error: (...message: any[]) => void;
  warn: (...message: any[]) => void;
  info: (...message: any[]) => void;
  debug: (...message: any[]) => void;
}

/**
 * 初始化日志系统
 * @param consoleLevel - 控制台日志级别 (error | warn | info | debug)
 * @param fileLevel - 文件日志级别 (error | warn | info | debug)
 */
export function initLogger(
  consoleLevel: LogLevel = 'info',
  fileLevel: LogLevel = 'debug',
): winston.Logger {
  // 更新配置
  config.consoleLevel = consoleLevel;
  config.fileLevel = fileLevel;

  // 生成唯一的日志文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFilePath = path.join(config.logDir, `app-${timestamp}.log`);

  // 控制台格式
  const colorizer = winston.format.colorize();
  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return colorizer.colorize(
        level,
        `${timestamp} [${level.toUpperCase()}]: ${message}`,
      );
    }),
  );

  // 文件格式 - 无颜色
  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    }),
  );

  globalLogger = winston.createLogger({
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    },
    transports: [
      // 控制台输出
      new winston.transports.Console({
        level: config.consoleLevel,
        format: consoleFormat,
      }),
      // 文件输出
      new winston.transports.File({
        level: config.fileLevel,
        filename: logFilePath,
        format: fileFormat,
      }),
    ],
    exitOnError: false,
  });

  return globalLogger;
}

/**
 * 获取日志器
 * @param isOpen - 是否开启日志（如果全局关闭则始终关闭）
 * @returns 日志器对象，包含 error/warn/info/debug 方法
 */
export function getLogger(isOpen: boolean = true): Logger {
  // 如果全局关闭或者当前文件关闭，则返回静默日志器
  if (!config.enabled || !isOpen) {
    return {
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
    };
  }

  // 如果日志器未初始化，使用默认级别初始化
  if (!globalLogger) {
    initLogger();
  }

  return {
    error: (...msg: any[]) => globalLogger!.error(formatMessage(...msg)),
    warn: (...msg: any[]) => globalLogger!.warn(formatMessage(...msg)),
    info: (...msg: any[]) => globalLogger!.info(formatMessage(...msg)),
    debug: (...msg: any[]) => globalLogger!.debug(formatMessage(...msg)),
  };
}

initLogger('debug', 'debug');
