export type AppEvent = {
  readonly type: "test-email.sent";
  readonly templateId: string;
};

export interface EventPublisher {
  publish(event: AppEvent): Promise<void>;
}
