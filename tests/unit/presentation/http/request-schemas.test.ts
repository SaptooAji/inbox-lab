import { describe, expect, it } from "vitest";
import { errorOf, unwrap } from "../../support/unwrap";
import { parseTestSendBody } from "@/presentation/http/request-schemas";

const valid = {
  email: "rina@example.com",
  firstName: "Rina",
  templateId: "welcome",
  consent: true,
  botToken: "token",
};

const WRONG_TYPE = "This field is missing or has the wrong type.";

describe("parseTestSendBody", () => {
  it("accepts a minimal body and defaults the honeypot to empty", () => {
    expect(unwrap(parseTestSendBody(valid))).toEqual({ ...valid, website: "" });
  });

  it("keeps an optional subject", () => {
    expect(unwrap(parseTestSendBody({ ...valid, subject: "Hi there" })).subject).toBe("Hi there");
  });

  it("drops fields it does not know", () => {
    expect(unwrap(parseTestSendBody({ ...valid, admin: true }))).toEqual({ ...valid, website: "" });
  });

  it("reports each missing field", () => {
    const fields = errorOf(parseTestSendBody({})).map((issue) => issue.field);

    expect([...fields].sort()).toEqual(["botToken", "consent", "email", "firstName", "templateId"]);
  });

  it("reports wrong types with a fixed message", () => {
    const issues = errorOf(parseTestSendBody({ ...valid, consent: "yes", email: 5 }));

    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual({ field: "consent", message: WRONG_TYPE });
    expect(issues).toContainEqual({ field: "email", message: WRONG_TYPE });
  });

  it("caps field sizes", () => {
    const issues = errorOf(parseTestSendBody({ ...valid, email: "a".repeat(321) }));

    expect(issues).toEqual([{ field: "email", message: "This value is too long." }]);
  });

  it.each([null, "text", 5, []])("rejects the non-object body %j", (body) => {
    expect(errorOf(parseTestSendBody(body))).toEqual([{ field: "body", message: WRONG_TYPE }]);
  });
});
