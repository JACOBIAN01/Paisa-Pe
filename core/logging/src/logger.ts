import { redact, redactString } from './redact';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  namespace: string;
  message: string;
  context?: unknown;
}

export interface LogSink {
  write(entry: LogEntry): void;
}

export interface MemorySink extends LogSink {
  entries: LogEntry[];
  clear(): void;
}

export const createMemorySink = (): MemorySink => {
  const entries: LogEntry[] = [];
  return {
    entries,
    write: (entry) => {
      entries.push(entry);
    },
    clear: () => {
      entries.length = 0;
    },
  };
};

export const consoleSink: LogSink = {
  write: ({ level, namespace, message, context }) => {
    const line = `[${namespace}] ${message}`;
    if (context === undefined) console[level](line);
    else console[level](line, context);
  },
};

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

let sink: LogSink = consoleSink;
let minLevel: LogLevel = 'debug';

export const setSink = (next: LogSink): void => {
  sink = next;
};
export const resetSink = (): void => {
  sink = consoleSink;
};
export const setMinLevel = (level: LogLevel): void => {
  minLevel = level;
};

export interface Logger {
  debug(message: string, context?: unknown): void;
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  error(message: string, context?: unknown): void;
  child(suffix: string): Logger;
}

export function createLogger(namespace: string): Logger {
  const log = (level: LogLevel, message: string, context?: unknown): void => {
    if (ORDER[level] < ORDER[minLevel]) return;
    sink.write({
      level,
      namespace,
      message: redactString(message),
      ...(context === undefined ? {} : { context: redact(context) }),
    });
  };
  return {
    debug: (m, c) => log('debug', m, c),
    info: (m, c) => log('info', m, c),
    warn: (m, c) => log('warn', m, c),
    error: (m, c) => log('error', m, c),
    child: (suffix) => createLogger(`${namespace}:${suffix}`),
  };
}
