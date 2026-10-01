import { describe, expect, it } from "vitest";
import { createPipeline } from "../../../emails/build/create-pipeline";

describe("createPipeline", () => {
  it("orders the steps so each one has what it needs", () => {
    const steps = createPipeline({
      components: { load: () => null },
      tokens: new Map(),
      mergeTags: ["firstName"],
    });

    expect(steps.map((step) => step.name)).toEqual([
      "compose",
      "tokens",
      "placeholder-guard",
      "inline-css",
      "dark-preview",
      "plain-text",
      "lint",
    ]);
  });
});
