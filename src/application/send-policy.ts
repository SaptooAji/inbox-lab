export interface SendPolicy {
  readonly sendingEnabled: boolean;
  readonly globalDailyCap: number;
  readonly perRecipientDailyLimit: number;
  readonly perIpDailyLimit: number;
}
