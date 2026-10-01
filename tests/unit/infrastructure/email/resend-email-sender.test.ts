import { describe, expect, it } from "vitest";
import { EmailDeliveryError } from "@/application/errors/application-errors";
import { ResendEmailSender } from "@/infrastructure/email/resend-email-sender";
import { bodyOf, createFakeFetch, headerOf, type FakeHandler } from "../../support/fake-fetch";
import { SpyLogger } from "../../support/fakes";
import { errorOf, unwrap } from "../../support/unwrap";

const API_KEY = "re_secret_key";
const FROM = "WDNusantara <hello@mail.example.com>";
const email = { to: "rina@example.com", subject: "Hello", html: "<p>x</p>", text: "x" };

function setup(handler: FakeHandler, replyTo?: string) {
  const { fetch, calls } = createFakeFetch(handler);
  const logger = new SpyLogger();
  const sender = new ResendEmailSender({ apiKey: API_KEY, from: FROM, replyTo, fetch, logger });
  return { sender, calls, logger };
}

const accepted = () => Response.json({ id: "msg-123" });

describe("ResendEmailSender", () => {
  it("posts the email to the Resend API and returns the message id", async () => {
    const { sender, calls } = setup(accepted);

    const receipt = unwrap(await sender.send(email));

    expect(receipt.providerMessageId).toBe("msg-123");
    const call = calls[0];
    expect(call?.url).toBe("https://api.resend.com/emails");
    expect(call?.init.method).toBe("POST");
    expect(call?.init.signal).toBeInstanceOf(AbortSignal);
    expect(call && headerOf(call, "authorization")).toBe(`Bearer ${API_KEY}`);
    expect(call && headerOf(call, "content-type")).toBe("application/json");
    expect(call && bodyOf(call)).toEqual({
      from: FROM,
      to: ["rina@example.com"],
      subject: "Hello",
      html: "<p>x</p>",
      text: "x",
    });
  });

  it("adds reply_to when one is configured", async () => {
    const { sender, calls } = setup(accepted, "me@example.com");

    await sender.send(email);

    expect(calls[0] && bodyOf(calls[0])).toMatchObject({ reply_to: "me@example.com" });
  });

  it("returns a delivery error when Resend refuses, and logs only safe facts", async () => {
    const { sender, logger } = setup(() =>
      Response.json(
        { statusCode: 422, name: "validation_error", message: "bad address rina@example.com" },
        { status: 422 },
      ),
    );

    const error = errorOf(await sender.send(email));

    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect(error.message).toContain("422");
    expect(logger.entries).toEqual([
      {
        level: "warn",
        message: "email request rejected",
        context: { status: 422, providerError: "validation_error" },
      },
    ]);
    const everything = JSON.stringify(logger.entries) + error.message;
    expect(everything).not.toContain("rina@example.com");
    expect(everything).not.toContain(API_KEY);
  });

  it("reports an unknown provider error name when the body is not JSON", async () => {
    const { sender, logger } = setup(() => new Response("Bad gateway", { status: 502 }));

    errorOf(await sender.send(email));

    expect(logger.entries[0]?.context).toEqual({ status: 502, providerError: "unknown" });
  });

  it("ignores a provider error name that does not look like an identifier", async () => {
    const { sender, logger } = setup(() =>
      Response.json({ name: "Contact rina@example.com now" }, { status: 400 }),
    );

    errorOf(await sender.send(email));

    expect(logger.entries[0]?.context).toEqual({ status: 400, providerError: "unknown" });
  });

  it("returns a delivery error instead of throwing when Resend is unreachable", async () => {
    const { sender, logger } = setup(() => Promise.reject(new TypeError("fetch failed")));

    const error = errorOf(await sender.send(email));

    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect(error.message).not.toContain(API_KEY);
    expect(logger.entries).toEqual([
      { level: "warn", message: "email request failed", context: { reason: "unreachable" } },
    ]);
  });

  it.each([
    ["has no id", () => Response.json({})],
    ["has a blank id", () => Response.json({ id: "" })],
    ["is not JSON", () => new Response("ok", { status: 200 })],
  ])("treats a success answer that %s as a failure", async (_name, handler) => {
    const { sender, logger } = setup(handler);

    expect(errorOf(await sender.send(email))).toBeInstanceOf(EmailDeliveryError);
    expect(logger.entries[0]?.context).toEqual({ reason: "unreadable-response" });
  });
});
