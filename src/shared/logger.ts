/**
 * Simple logger utility for the Translation Helps Proxy
 * Compatible with Node.js and CloudFlare Workers
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(config: LoggerConfig = { level: LogLevel.INFO }) {
    this.level = config.level;
    this.prefix = config.prefix || '[TranslationHelps]';
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    return `${timestamp} ${this.prefix} ${level}: ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }
}

// Default logger instance
export const logger = new Logger();

// Factory function for creating loggers with different prefixes
export function createLogger(prefix: string, level?: LogLevel): Logger {
  return new Logger({ level: level ?? LogLevel.INFO, prefix });
}