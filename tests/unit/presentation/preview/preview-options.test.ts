import { describe, expect, it } from "vitest";
import {
  DEVICE_WIDTH_PX,
  isPreviewVariant,
  previewUrl,
  previewVariant,
} from "@/presentation/preview/preview-options";

describe("previewVariant", () => {
  it.each([
    ["email", "light", "light"],
    ["email", "dark", "dark"],
    ["text", "light", "text"],
    ["text", "dark", "text"],
  ] as const)("view %s with theme %s shows the %s variant", (view, scheme, expected) => {
    expect(previewVariant(view, scheme)).toBe(expected);
  });
});

describe("previewUrl", () => {
  it("builds the preview path", () => {
    expect(previewUrl("welcome", "dark")).toBe("/preview/welcome/dark");
  });

  it("encodes the template id", () => {
    expect(previewUrl("a b/c", "text")).toBe("/preview/a%20b%2Fc/text");
  });
});

describe("DEVICE_WIDTH_PX", () => {
  it("is narrower on mobile than on desktop", () => {
    expect(DEVICE_WIDTH_PX.mobile).toBe(375);
    expect(DEVICE_WIDTH_PX.desktop).toBe(640);
  });
});

describe("isPreviewVariant", () => {
  it.each(["light", "dark", "text"])("accepts %j", (value) => {
    expect(isPreviewVariant(value)).toBe(true);
  });

  it.each(["", "Light", "sepia", "light "])("rejects %j", (value) => {
    expect(isPreviewVariant(value)).toBe(false);
  });
});
