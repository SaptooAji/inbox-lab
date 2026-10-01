export interface BuildContext {
  readonly name: string;
  readonly html: string;
  readonly darkHtml?: string;
  readonly text?: string;
  readonly warnings?: readonly string[];
}
export interface BuildStep {
  readonly name: string;
  run(context: BuildContext): BuildContext | Promise<BuildContext>;
}

export class BuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildError";
  }
}
