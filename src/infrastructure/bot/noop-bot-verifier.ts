import type { BotVerifier } from "@/application/ports/bot-verifier";

/** Local development only. The production guard in the config refuses this driver. */
export class NoopBotVerifier implements BotVerifier {
  verify(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
