import { describe, expect, it } from "vitest";
import { EmailAddress } from "@/domain/value-objects/email-address";

describe("EmailAddress.create", () => {
  it("accepts a valid address and normalises it", () => {
    const result = EmailAddress.create("  Rina@Example.COM ");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).toBe("rina@example.com");
    }
  });

  it.each(["", "   ", "no-at-sign", "a@b", "a b@example.com", "@example.com", "a@@example.com"])(
    "rejects %j",
    (raw) => {
      const result = EmailAddress.create(raw);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.field).toBe("email");
      }
    },
  );

  it("rejects addresses longer than 254 characters", () => {
    const tooLong = `${"a".repeat(250)}@example.com`;

    expect(EmailAddress.create(tooLong).ok).toBe(false);
  });
});
