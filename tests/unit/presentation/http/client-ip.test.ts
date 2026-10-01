import { describe, expect, it } from "vitest";
import { getClientIp } from "@/presentation/http/client-ip";

describe("getClientIp", () => {
  it("prefers x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" });

    expect(getClientIp(headers)).toBe("203.0.113.7");
  });

  it("uses the first x-forwarded-for entry otherwise", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe(
      "198.51.100.1",
    );
  });

  it("trims whitespace and accepts IPv6", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": " 2001:db8::1 , 10.0.0.1" }))).toBe(
      "2001:db8::1",
    );
  });

  it("skips an empty x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "  ", "x-forwarded-for": "198.51.100.1" });

    expect(getClientIp(headers)).toBe("198.51.100.1");
  });

  it("puts clients it cannot identify into one shared bucket", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });

  it("treats an absurdly long value as unknown", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "a".repeat(65) }))).toBe("unknown");
  });
});
