/**
 * Centralized debug logging utility
 */

const DEBUG = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

class DebugLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
  }

  log(category, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, category, message, data };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (DEBUG) {
      const prefix = `[${category.toUpperCase()}]`;
      data ? console.log(prefix, message, data) : console.log(prefix, message);
    }

    return logEntry;
  }

  error(category, message, error = null) {
    const logEntry = this.log(category, `❌ ${message}`, error);
    console.error(`[${category.toUpperCase()}]`, message, error);
    return logEntry;
  }

  success(category, message, data = null) {
    return this.log(category, `✅ ${message}`, data);
  }

  warn(category, message, data = null) {
    const logEntry = this.log(category, `⚠️  ${message}`, data);
    if (DEBUG) {
      console.warn(`[${category.toUpperCase()}]`, message, data);
    }
    return logEntry;
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }
}

export const debugLogger = new DebugLogger();

// Category-specific loggers
export const createLogger = (category) => ({
  log: (msg, data) => debugLogger.log(category, msg, data),
  error: (msg, err) => debugLogger.error(category, msg, err),
  success: (msg, data) => debugLogger.success(category, msg, data),
  warn: (msg, data) => debugLogger.warn(category, msg, data),
});

export const logger = {
  api: createLogger('API'),
  ai: createLogger('AI'),
  weather: createLogger('WEATHER'),
  stream: createLogger('STREAM'),
};
