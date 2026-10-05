export type ProofScheme = "light" | "dark";
export type ProofSource = "real" | "simulated";

/** One screenshot in the rendering proof gallery. */
export interface ProofEntry {
  readonly id: string;
  readonly templateId: string;
  readonly client: string;
  readonly tool: string;
  readonly scheme: ProofScheme;
  /** Calendar date as YYYY-MM-DD. */
  readonly date: string;
  readonly source: ProofSource;
  /** File name inside public/proof/, never a path. */
  readonly image: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly note?: string | undefined;
}
