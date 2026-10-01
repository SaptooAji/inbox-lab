import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseConfig } from "@/infrastructure/config/config";
import { createContainer } from "@/infrastructure/container";
import { handleTestSend } from "@/presentation/http/handle-test-send";
import { createBuildOutputFixture, type BuildOutputFixture } from "../unit/support/build-output";
import { ManualClock } from "../unit/support/clocks";
import { aTemplate } from "../unit/support/fakes";

const valid = {
  email: "rina@example.com",
  firstName: "Rina",
  templateId: "welcome",
  consent: true,
  botToken: "",
};

describe("POST /api/v1/test-sends, wired for real", () => {
  let fixture: BuildOutputFixture;
  let printed: string[];

  beforeEach(() => {
    fixture = createBuildOutputFixture([aTemplate("welcome"), aTemplate("win-back")]);
    printed = [];
  });

  afterEach(() => {
    fixture.dispose();
  });

  function endpoint() {
    const container = createContainer(
      parseConfig({ IDENTITY_HASH_SALT: "a-long-enough-secret-salt" }),
      {
        buildOutputDirectory: fixture.directory,
        clock: new ManualClock(),
        write: (line) => printed.push(line),
      },
    );
    return (body: unknown, ip = "203.0.113.7") =>
      handleTestSend(
        new Request("http://localhost/api/v1/test-sends", {
          method: "POST",
          headers: { "content-type": "application/json", "x-real-ip": ip },
          body: JSON.stringify(body),
        }),
        () => container,
      );
  }

  const bodyOf = async (response: Response): Promise<unknown> => response.json();
  const sentEmails = () => printed.filter((line) => line.includes("To: "));

  it("accepts a valid request and sends the email", async () => {
    const response = await endpoint()(valid);

    expect(response.status).toBe(202);
    expect(await bodyOf(response)).toEqual({ receiptId: "console-1" });
    expect(sentEmails()).toHaveLength(1);
    expect(sentEmails()[0]).toContain("To: rina@example.com");
  });

  it("refuses a second email to the same address, from anywhere", async () => {
    const post = endpoint();
    await post(valid, "198.51.100.1");

    const response = await post(valid, "198.51.100.2");

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("86400");
    expect(sentEmails()).toHaveLength(1);
  });

  it("explains an invalid address field by field", async () => {
    const response = await endpoint()({ ...valid, email: "nope" });

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toMatchObject({
      errors: [{ field: "email", message: "Enter a valid email address." }],
    });
  });

  it("rejects an unknown template id as an invalid field", async () => {
    const response = await endpoint()({ ...valid, templateId: "ghost" });

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toMatchObject({ errors: [{ field: "templateId" }] });
  });

  it("answers 404 for a known id the build output does not contain", async () => {
    const response = await endpoint()({ ...valid, templateId: "community-digest" });

    expect(response.status).toBe(404);
    expect(await bodyOf(response)).toMatchObject({ code: "TEMPLATE_NOT_FOUND" });
  });

  it("pretends to accept a filled honeypot but sends nothing", async () => {
    const response = await endpoint()({ ...valid, website: "http://spam.example" });

    expect(response.status).toBe(202);
    expect(sentEmails()).toHaveLength(0);
  });
});
