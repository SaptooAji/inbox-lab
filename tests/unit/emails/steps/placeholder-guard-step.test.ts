import { describe, expect, it } from "vitest";
import { PlaceholderGuardStep } from "../../../../emails/build/steps/placeholder-guard-step";

const run = (html: string) => new PlaceholderGuardStep().run({ name: "welcome", html });

describe("PlaceholderGuardStep", () => {
  it("passes html with no build placeholders, including runtime merge tags", async () => {
    const context = { name: "welcome", html: "<p>{{firstName}}</p>" };

    expect(await run(context.html)).toEqual(context);
  });

  it("fails and lists leftover placeholders", () => {
    expect(() => run("<p>[[label]]</p><p>[[href]]</p><p>[[label]]</p>")).toThrow(
      "Unresolved placeholders: [[label]], [[href]]",
    );
  });
});
