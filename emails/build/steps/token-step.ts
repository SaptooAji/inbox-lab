import { BuildError, type BuildContext, type BuildStep } from "../build-step";

const TOKEN = /\[\[([A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+)\]\]/g;

export class TokenStep implements BuildStep {
  readonly name = "tokens";

  constructor(private readonly tokens: ReadonlyMap<string, string>) {}

  run(context: BuildContext): BuildContext {
    const unknown = new Set<string>();
    const html = context.html.replace(TOKEN, (placeholder, key: string) => {
      const value = this.tokens.get(key);
      if (value === undefined) {
        unknown.add(key);
        return placeholder;
      }
      return value;
    });

    if (unknown.size > 0) {
      throw new BuildError(`Unknown design tokens: ${[...unknown].join(", ")}`);
    }
    return { ...context, html };
  }
}
