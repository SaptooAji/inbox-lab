import { BuildError, type BuildContext, type BuildStep } from "../build-step";

export interface ComponentLoader {
  load(name: string): string | null;
}

const INCLUDE = /<!--@include\s+([a-z][a-z0-9-]*)((?:\s+[A-Za-z][A-Za-z0-9]*="[^"]*")*)\s*-->/g;
const PARAM = /([A-Za-z][A-Za-z0-9]*)="([^"]*)"/g;
const PARAM_PLACEHOLDER = /\[\[([A-Za-z][A-Za-z0-9]*)\]\]/g;

function parseParams(raw: string): ReadonlyMap<string, string> {
  const params = new Map<string, string>();
  for (const match of raw.matchAll(PARAM)) {
    const [, key, value] = match;
    if (key !== undefined && value !== undefined) {
      params.set(key, value);
    }
  }
  return params;
}

function applyParams(source: string, params: ReadonlyMap<string, string>): string {
  return source.replace(
    PARAM_PLACEHOLDER,
    (placeholder, name: string) => params.get(name) ?? placeholder,
  );
}

/** Resolves <!--@include name key="value"--> into component markup. Values are raw, trusted HTML. */
export class ComposeStep implements BuildStep {
  readonly name = "compose";

  constructor(private readonly components: ComponentLoader) {}

  run(context: BuildContext): BuildContext {
    return { ...context, html: this.expand(context.html, []) };
  }

  private expand(html: string, stack: readonly string[]): string {
    return html.replace(INCLUDE, (_match, name: string, rawParams: string) => {
      if (stack.includes(name)) {
        throw new BuildError(`Circular include: ${[...stack, name].join(" -> ")}`);
      }
      const source = this.components.load(name);
      if (source === null) {
        throw new BuildError(`Unknown component "${name}"`);
      }
      return this.expand(applyParams(source, parseParams(rawParams)), [...stack, name]);
    });
  }
}
