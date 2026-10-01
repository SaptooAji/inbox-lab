import { describe, expect, it } from "vitest";
import { BuildError, type BuildContext, type BuildStep } from "../../../emails/build/build-step";
import { runPipeline } from "../../../emails/build/pipeline";

const append = (suffix: string): BuildStep => ({
  name: `append-${suffix}`,
  run: (context) => ({ ...context, html: context.html + suffix }),
});

const appendAsync = (suffix: string): BuildStep => ({
  name: `append-async-${suffix}`,
  run: (context) => Promise.resolve({ ...context, html: context.html + suffix }),
});

const initial: BuildContext = { name: "welcome", html: "a" };

describe("runPipeline", () => {
  it("runs sync and async steps in order", async () => {
    const result = await runPipeline([append("b"), appendAsync("c"), append("d")], initial);

    expect(result.html).toBe("abcd");
  });

  it("returns the initial context when there are no steps", async () => {
    expect(await runPipeline([], initial)).toEqual(initial);
  });

  it("names the template and the step when a step throws", async () => {
    const failing: BuildStep = {
      name: "boom",
      run: () => {
        throw new Error("it broke");
      },
    };

    const run = runPipeline([append("b"), failing], initial);

    await expect(run).rejects.toThrow(BuildError);
    await expect(run).rejects.toThrow('welcome: step "boom" failed: it broke');
  });

  it("also handles steps that reject with something that is not an Error", async () => {
    const failing: BuildStep = { name: "odd", run: () => Promise.reject("plain text") };

    await expect(runPipeline([failing], initial)).rejects.toThrow(
      'welcome: step "odd" failed: plain text',
    );
  });
});
