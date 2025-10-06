import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Create the logger
const logger = winston.createLogger({
  level: (process.env as any).LOG_LEVEL || 'info',
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-hive-mind' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }),
  ],
});

// If we're not in production then log to the `console` with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(
        (info: any) => `${info.timestamp} ${info.level}: ${info.message}${info.context ? ` | ${JSON.stringify(info.context)}` : ''}`
      )
    ),
  }));
}

// Create a stream object for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for contextual logging
export const createContextLogger = (context: string) => ({
  error: (message: string, meta?: any) => logger.error(message, { context, ...meta }),
  warn: (message: string, meta?: any) => logger.warn(message, { context, ...meta }),
  info: (message: string, meta?: any) => logger.info(message, { context, ...meta }),
  http: (message: string, meta?: any) => logger.http(message, { context, ...meta }),
  debug: (message: string, meta?: any) => logger.debug(message, { context, ...meta }),
});

// Performance logging helpers
export const logPerformance = (operation: string, startTime: number, context?: any) => {
  const duration = Date.now() - startTime;
  logger.info(`Performance: ${operation}`, {
    context: 'performance',
    operation,
    duration,
    ...context,
  });
  return duration;
};

// Request logging helper
export const logRequest = (method: string, url: string, statusCode: number, duration: number, userId?: string) => {
  logger.info(`Request: ${method} ${url}`, {
    context: 'request',
    method,
    url,
    statusCode,
    duration,
    userId,
  });
};

// Memory operation logging
export const logMemoryOperation = (operation: string, memoryId: string, userId: string, duration?: number) => {
  logger.info(`Memory ${operation}`, {
    context: 'memory',
    operation,
    memoryId,
    userId,
    duration,
  });
};

// AI interaction logging
export const logAIInteraction = (companionId: string, userId: string, messageLength: number, responseTime: number) => {
  logger.info('AI Interaction', {
    context: 'ai',
    companionId,
    userId,
    messageLength,
    responseTime,
  });
};

export { logger };
export default logger;