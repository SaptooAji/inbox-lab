import { BuildError, type BuildContext, type BuildStep } from "../build-step";

const ANY_PLACEHOLDER = /\[\[[^\]]*\]\]/g;

/** Last line of defence: nothing with [[...]] may reach the output. */
export class PlaceholderGuardStep implements BuildStep {
  readonly name = "placeholder-guard";

  run(context: BuildContext): BuildContext {
    const leftovers = new Set(context.html.match(ANY_PLACEHOLDER) ?? []);
    if (leftovers.size > 0) {
      throw new BuildError(`Unresolved placeholders: ${[...leftovers].join(", ")}`);
    }
    return context;
  }
}
