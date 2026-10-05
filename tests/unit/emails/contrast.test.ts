import { describe, expect, it } from "vitest";
import { contrastRatio } from "../../../emails/build/contrast";
import { flattenTokens } from "../../../emails/build/tokens";
import tokens from "../../../emails/tokens/tokens.json";

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for identical colours", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 2);
    expect(contrastRatio("#0F4C45", "#0F4C45")).toBeCloseTo(1, 5);
  });

  it("does not depend on argument order", () => {
    expect(contrastRatio("#1B1F1E", "#FFFFFF")).toBe(contrastRatio("#FFFFFF", "#1B1F1E"));
  });

  it("matches a known value", () => {
    expect(contrastRatio("#1B1F1E", "#FFFFFF")).toBeCloseTo(16.65, 1);
  });
});

const flat = flattenTokens(tokens);
const MINIMUM_NORMAL_TEXT = 4.5;
const PAIRS: [string, string][] = [
  ["text", "bg"],
  ["text", "surface"],
  ["muted", "bg"],
  ["muted", "surface"],
  ["onPrimary", "primary"],
  ["onAccent", "accent"],
  ["link", "bg"],
  ["link", "surface"],
  // Modern redesign: tinted cards, eyebrow pills and the dark hero band.
  ["text", "tint"],
  ["muted", "tint"],
  ["link", "tint"],
  ["eyebrow", "tint"],
  ["heroMuted", "primary"],
];

describe.each([
  ["light", "color"],
  ["dark", "dark.color"],
])("%s palette", (_name, prefix) => {
  it.each(PAIRS)("%s on %s meets WCAG AA for normal text", (foreground, background) => {
    const fg = flat.get(`${prefix}.${foreground}`);
    const bg = flat.get(`${prefix}.${background}`);

    expect(fg).toBeDefined();
    expect(bg).toBeDefined();
    expect(contrastRatio(fg ?? "", bg ?? "")).toBeGreaterThanOrEqual(MINIMUM_NORMAL_TEXT);
  });
});
