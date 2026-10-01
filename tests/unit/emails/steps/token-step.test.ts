import { describe, expect, it } from "vitest";
import { TokenStep } from "../../../../emails/build/steps/token-step";

const tokens = new Map([
  ["color.primary", "#0F4C45"],
  ["dark.color.bg", "#0F1614"],
]);

const run = (html: string) => new TokenStep(tokens).run({ name: "welcome", html });

describe("TokenStep", () => {
  it("replaces every dotted token", async () => {
    const result = await run("a [[color.primary]] b [[dark.color.bg]] c [[color.primary]]");

    expect(result.html).toBe("a #0F4C45 b #0F1614 c #0F4C45");
  });

  it("leaves component parameters and runtime merge tags alone", async () => {
    const result = await run("[[label]] {{firstName}} [[color.primary]]");

    expect(result.html).toBe("[[label]] {{firstName}} #0F4C45");
  });

  it("fails on unknown tokens and lists each one once", () => {
    expect(() => run("[[color.nope]] [[color.also]] [[color.nope]]")).toThrow(
      "Unknown design tokens: color.nope, color.also",
    );
  });
});
