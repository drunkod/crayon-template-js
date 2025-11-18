/**
 * Centralized debug utility for easy troubleshooting
 */

const DEBUG = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

class DebugLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
  }

  log(category, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      category,
      message,
      data,
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (DEBUG) {
      const prefix = `[${category.toUpperCase()}]`;
      if (data) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
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
export const apiDebug = {
  log: (msg, data) => debugLogger.log('API', msg, data),
  error: (msg, err) => debugLogger.error('API', msg, err),
  success: (msg, data) => debugLogger.success('API', msg, data),
  warn: (msg, data) => debugLogger.warn('API', msg, data),
};

export const aiDebug = {
  log: (msg, data) => debugLogger.log('AI', msg, data),
  error: (msg, err) => debugLogger.error('AI', msg, err),
  success: (msg, data) => debugLogger.success('AI', msg, data),
  warn: (msg, data) => debugLogger.warn('AI', msg, data),
};

export const weatherDebug = {
  log: (msg, data) => debugLogger.log('WEATHER', msg, data),
  error: (msg, err) => debugLogger.error('WEATHER', msg, err),
  success: (msg, data) => debugLogger.success('WEATHER', msg, data),
};

export const streamDebug = {
  log: (msg, data) => debugLogger.log('STREAM', msg, data),
  error: (msg, err) => debugLogger.error('STREAM', msg, err),
  success: (msg, data) => debugLogger.success('STREAM', msg, data),
};