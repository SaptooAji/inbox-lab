import type { BotVerifier } from "@/application/ports/bot-verifier";
import { HTTP_TIMEOUT_MS, type FetchLike } from "../http/fetch-like";
import { readField } from "../http/read-field";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;
const UNKNOWN_IP = "unknown";

export interface TurnstileBotVerifierOptions {
  readonly secretKey: string;
  readonly fetch: FetchLike;
}

/**
 * A refused token returns false. An outage throws, because answering "you are a bot"
 * would be a lie. The handler turns the throw into a logged 500.
 */
export class TurnstileBotVerifier implements BotVerifier {
  constructor(private readonly options: TurnstileBotVerifierOptions) {}

  async verify(token: string, clientIp: string): Promise<boolean> {
    if (token.trim() === "" || token.length > MAX_TOKEN_LENGTH) {
      return false;
    }

    const answer = await this.ask(token, clientIp);
    if (readField(answer, "success") === true) {
      return true;
    }
    const codes = readField(answer, "error-codes");
    if (Array.isArray(codes) && codes.includes("internal-error")) {
      throw new Error("The bot check service reported an internal error.");
    }
    return false;
  }

  private async ask(token: string, clientIp: string): Promise<unknown> {
    let response: Response;
    try {
      response = await this.options.fetch(SITEVERIFY_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          secret: this.options.secretKey,
          response: token,
          ...(clientIp === UNKNOWN_IP ? {} : { remoteip: clientIp }),
        }),
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
    } catch {
      throw new Error("The bot check service could not be reached.");
    }

    if (!response.ok) {
      throw new Error(`The bot check service answered with status ${response.status}.`);
    }
    try {
      return await response.json();
    } catch {
      throw new Error("The bot check service sent an unreadable answer.");
    }
  }
}
