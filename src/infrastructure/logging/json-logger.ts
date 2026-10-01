import type { Clock } from "@/application/ports/clock";
import type { LogContext, Logger } from "@/application/ports/logger";
import type { LogLevel } from "../config/config";

const RANK: Readonly<Record<LogLevel, number>> = { debug: 0, info: 1, warn: 2, error: 3 };

/** One JSON object per line, which hosting platforms collect and index as structured logs. */
export class JsonLogger implements Logger {
  constructor(
    private readonly minimum: LogLevel,
    private readonly clock: Clock,
    private readonly write: (line: string) => void,
  ) {}

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }

  private log(level: "info" | "warn" | "error", message: string, context?: LogContext): void {
    if (RANK[level] < RANK[this.minimum]) {
      return;
    }
    this.write(
      JSON.stringify({ ...context, level, time: this.clock.now().toISOString(), message }),
    );
  }
}
