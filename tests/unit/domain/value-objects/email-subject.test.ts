import { describe, expect, it } from "vitest";
import { EmailSubject } from "@/domain/value-objects/email-subject";

describe("EmailSubject.create", () => {
  it("trims and accepts a normal subject", () => {
    const result = EmailSubject.create("  Welcome to NusaFlow ");

    expect(result.ok && result.value.value).toBe("Welcome to NusaFlow");
  });

  it("accepts exactly 80 characters", () => {
    expect(EmailSubject.create("a".repeat(80)).ok).toBe(true);
  });

  it.each([
    "",
    "   ",
    "a".repeat(81),
    "Hi\nBcc: victim@example.com",
    "Hi\r\nX-Header: 1",
    "Hi\tthere",
  ])("rejects %j", (raw) => {
    const result = EmailSubject.create(raw);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe("subject");
    }
  });
});
