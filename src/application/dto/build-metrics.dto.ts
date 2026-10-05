/** Measured size of one built email, in bytes. */
export interface TemplateBuildMetrics {
  readonly templateId: string;
  readonly htmlBytes: number;
  readonly textBytes: number;
}
