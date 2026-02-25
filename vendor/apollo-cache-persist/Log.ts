import { ApolloPersistOptions, LogLevel, LogLine } from "./types";

export default class Log<T> {
  debug: boolean;
  lines: Array<LogLine>;

  static buffer = 30;
  static prefix = "[apollo-cache-persist]";

  constructor(options: Pick<ApolloPersistOptions<T>, "debug">) {
    const { debug = false } = options;

    this.debug = debug;
    this.lines = [];
  }

  emit(level: LogLevel, message: unknown[]): void {
    if (level in console) {
      const { prefix } = Log;
      console[level](prefix, ...message);
    }
  }

  tailLogs(): void {
    this.lines.forEach(([level, message]) => this.emit(level, message));
  }

  getLogs(): Array<LogLine> {
    return this.lines;
  }

  write(level: LogLevel, message: unknown[]): void {
    const { buffer } = Log;

    this.lines = [...this.lines.slice(1 - buffer), [level, message]];

    if (this.debug || level !== "log") {
      this.emit(level, message);
    }
  }

  info(...message: unknown[]): void {
    this.write("log", message);
  }

  warn(...message: unknown[]): void {
    this.write("warn", message);
  }

  error(...message: unknown[]): void {
    this.write("error", message);
  }
}
