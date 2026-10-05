import type { EventPublisher } from "@/application/ports/event-publisher";

export class NoopEventPublisher implements EventPublisher {
  publish(): Promise<void> {
    return Promise.resolve();
  }
}
