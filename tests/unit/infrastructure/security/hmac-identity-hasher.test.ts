import { describe, expect, it } from "vitest";
import { HmacIdentityHasher } from "@/infrastructure/security/hmac-identity-hasher";

const SALT = "a-long-enough-secret-salt";

describe("HmacIdentityHasher", () => {
  const hasher = new HmacIdentityHasher(SALT);

  it("is deterministic", () => {
    expect(hasher.hash("ip:203.0.113.7")).toBe(hasher.hash("ip:203.0.113.7"));
  });

  it("returns a 64 character hex digest that does not contain the input", () => {
    const digest = hasher.hash("recipient:rina@example.com");

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toContain("rina");
  });

  it("gives different inputs different digests", () => {
    expect(hasher.hash("a")).not.toBe(hasher.hash("b"));
  });

  it("depends on the salt", () => {
    expect(new HmacIdentityHasher("another-long-enough-salt").hash("a")).not.toBe(hasher.hash("a"));
  });

  it("refuses a short salt", () => {
    expect(() => new HmacIdentityHasher("short")).toThrow("at least 16");
  });
});
