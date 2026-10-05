import type { Clock } from "@/application/ports/clock";

export class ManualClock implements Clock {
  constructor(private current: Date = new Date("2026-01-01T00:00:00Z")) {}

  now(): Date {
    return new Date(this.current);
  }

  advanceSeconds(seconds: number): void {
    this.current = new Date(this.current.getTime() + seconds * 1000);
  }
}
