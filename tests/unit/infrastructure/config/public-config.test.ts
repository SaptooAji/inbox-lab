import { describe, expect, it } from "vitest";
import { parsePublicConfig } from "@/infrastructure/config/public-config";

describe("parsePublicConfig", () => {
  it("reads and trims the Turnstile site key", () => {
    expect(parsePublicConfig({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: " site-key " })).toEqual({
      turnstileSiteKey: "site-key",
    });
  });

  it.each([{}, { NEXT_PUBLIC_TURNSTILE_SITE_KEY: "" }, { NEXT_PUBLIC_TURNSTILE_SITE_KEY: "   " }])(
    "treats %j as no site key",
    (env) => {
      expect(parsePublicConfig(env)).toEqual({ turnstileSiteKey: undefined });
    },
  );
});
