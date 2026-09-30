import { describe, expect, it } from "vitest";
import { RecipientName } from "@/domain/value-objects/recipient-name";

describe("RecipientName.create", () => {
  it("trims surrounding whitespace", () => {
    const result = RecipientName.create("  Rina ");

    expect(result.ok && result.value.value).toBe("Rina");
  });

  it.each(["Rina", "Anne-Marie", "O'Brien", "D’Angelo", "Dewi Sartika", "José", "Nguyễn"])(
    "accepts %j",
    (raw) => {
      expect(RecipientName.create(raw).ok).toBe(true);
    },
  );

  it.each([
    "",
    "   ",
    "R1na",
    "<script>",
    "Rina\nSmith",
    "Rina\tSmith",
    "-Rina",
    "Rina 😀",
    "a".repeat(41),
  ])("rejects %j", (raw) => {
    const result = RecipientName.create(raw);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe("firstName");
    }
  });

  it("accepts exactly 40 characters", () => {
    expect(RecipientName.create("a".repeat(40)).ok).toBe(true);
  });
});
