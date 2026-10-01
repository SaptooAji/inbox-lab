import { BuildError, type BuildContext, type BuildStep } from "./build-step";

export async function runPipeline(
  steps: readonly BuildStep[],
  initial: BuildContext,
): Promise<BuildContext> {
  let context = initial;
  for (const step of steps) {
    try {
      context = await step.run(context);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new BuildError(`${context.name}: step "${step.name}" failed: ${reason}`);
    }
  }
  return context;
}
