import { describe, expect, it } from "vitest";
import { flattenTokens } from "../../../emails/build/tokens";
import tokens from "../../../emails/tokens/tokens.json";

describe("flattenTokens", () => {
  it("flattens nested trees into dotted keys and stringifies numbers", () => {
    const flat = flattenTokens({ color: { bg: "#FFF" }, layout: { width: 600 } });

    expect(flat.get("color.bg")).toBe("#FFF");
    expect(flat.get("layout.width")).toBe("600");
    expect(flat.size).toBe(2);
  });
});

describe("tokens.json", () => {
  const flat = flattenTokens(tokens);
  const colorKeys = [...flat.keys()].filter((key) => key.startsWith("color."));

  it("defines only valid 6-digit hex colours", () => {
    for (const key of [
      ...colorKeys,
      ...[...flat.keys()].filter((k) => k.startsWith("dark.color.")),
    ]) {
      expect(flat.get(key), key).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("has a dark value for every light colour", () => {
    for (const key of colorKeys) {
      expect(flat.has(`dark.${key}`), `dark.${key}`).toBe(true);
    }
  });
});
