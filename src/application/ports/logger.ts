export type LogContext = Readonly<Record<string, unknown>>;

/** Never log raw email addresses, names, IPs or tokens. */
export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}
