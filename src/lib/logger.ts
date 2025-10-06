type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  userId?: number | undefined;
  sessionId?: string | undefined;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  debug(message: string, data?: any, userId?: number, sessionId?: string) {
    this.log('debug', message, data, userId, sessionId);
  }

  info(message: string, data?: any, userId?: number, sessionId?: string) {
    this.log('info', message, data, userId, sessionId);
  }

  warn(message: string, data?: any, userId?: number, sessionId?: string) {
    this.log('warn', message, data, userId, sessionId);
  }

  error(message: string, data?: any, userId?: number, sessionId?: string) {
    this.log('error', message, data, userId, sessionId);
  }

  private log(level: LogLevel, message: string, data?: any, userId?: number, sessionId?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      userId,
      sessionId,
    };

    this.logs.push(entry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In production, you would send to a logging service
    console.log(`[${entry.timestamp}] ${level.toUpperCase()}: ${message}`, data ? data : '');
  }

  getLogs(level?: LogLevel, limit = 100): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    return filteredLogs.slice(-limit);
  }

  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
      },
      recentErrors: 0,
    };

    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    this.logs.forEach(log => {
      stats.byLevel[log.level]++;

      if (log.level === 'error' && new Date(log.timestamp).getTime() > oneHourAgo) {
        stats.recentErrors++;
      }
    });

    return stats;
  }
}

export const logger = Logger.getInstance();

// Performance monitoring
export class PerformanceMonitor {
  private static timers = new Map<string, number>();

  static startTimer(key: string) {
    this.timers.set(key, Date.now());
  }

  static endTimer(key: string): number {
    const startTime = this.timers.get(key);
    if (!startTime) return 0;

    const duration = Date.now() - startTime;
    this.timers.delete(key);

    logger.info(`Performance: ${key} took ${duration}ms`);
    return duration;
  }

  static measureAsync<T>(key: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(key);
    return fn().finally(() => this.endTimer(key));
  }
}