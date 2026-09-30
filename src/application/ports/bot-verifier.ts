export interface BotVerifier {
  verify(token: string, clientIp: string): Promise<boolean>;
}
