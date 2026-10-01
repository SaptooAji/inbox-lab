import type { AppEvent, EventPublisher } from "@/application/ports/event-publisher";
import { HTTP_TIMEOUT_MS, type FetchLike } from "../http/fetch-like";

export interface WebhookEventPublisherOptions {
  readonly url: string;
  readonly fetch: FetchLike;
}

/** Messages never include the URL, because automation webhook URLs act as secrets. */
export class WebhookEventPublisher implements EventPublisher {
  constructor(private readonly options: WebhookEventPublisherOptions) {}

  async publish(event: AppEvent): Promise<void> {
    let response: Response;
    try {
      response = await this.options.fetch(this.options.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
    } catch {
      throw new Error("The webhook could not be reached.");
    }
    if (!response.ok) {
      throw new Error(`The webhook answered with status ${response.status}.`);
    }
  }
}
