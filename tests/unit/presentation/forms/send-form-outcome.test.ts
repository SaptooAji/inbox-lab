import { describe, expect, it } from "vitest";
import {
  buildSendBody,
  describeWait,
  interpretSendResponse,
  submitTestSend,
  type SendFormValues,
} from "@/presentation/forms/send-form-outcome";
import { bodyOf, createFakeFetch, headerOf } from "../../support/fake-fetch";

const values: SendFormValues = {
  email: "  rina@example.com ",
  firstName: " Rina ",
  subject: "  ",
  consent: true,
  website: "",
};

describe("buildSendBody", () => {
  it("trims the text, adds the template and token, and leaves out a blank subject", () => {
    expect(buildSendBody(values, "welcome", "tok")).toEqual({
      email: "rina@example.com",
      firstName: "Rina",
      templateId: "welcome",
      consent: true,
      botToken: "tok",
      website: "",
    });
  });

  it("keeps a subject that has text, trimmed", () => {
    expect(buildSendBody({ ...values, subject: " Hi " }, "welcome", "tok").subject).toBe("Hi");
  });

  it("passes the honeypot value through untouched", () => {
    const body = buildSendBody({ ...values, website: "http://spam.example" }, "welcome", "tok");

    expect(body.website).toBe("http://spam.example");
  });
});

describe("describeWait", () => {
  it.each([
    [1, "a minute"],
    [60, "a minute"],
    [61, "2 minutes"],
    [3540, "59 minutes"],
    [3599, "an hour"],
    [3600, "an hour"],
    [3601, "2 hours"],
    [86_400, "24 hours"],
  ])("describes %i seconds as %s", (seconds, expected) => {
    expect(describeWait(seconds)).toBe(expected);
  });
});

const respond = (status: number, body: unknown = undefined, retryAfter: string | null = null) =>
  interpretSendResponse({ status, body, retryAfter });

describe("interpretSendResponse", () => {
  it("treats 202 as sent", () => {
    expect(respond(202)).toEqual({ kind: "sent" });
  });

  it("maps field errors from a 400, keeping the first message per field", () => {
    const outcome = respond(400, {
      detail: "ignored",
      errors: [
        { field: "email", message: "Enter a valid email address." },
        { field: "email", message: "a second message" },
        { field: "firstName", message: "Use 1 to 40 letters, spaces, hyphens or apostrophes." },
      ],
    });

    expect(outcome).toEqual({
      kind: "invalid",
      message: "Please fix the highlighted fields.",
      fieldErrors: {
        email: "Enter a valid email address.",
        firstName: "Use 1 to 40 letters, spaces, hyphens or apostrophes.",
      },
    });
  });

  it.each([
    ["only unknown fields", { errors: [{ field: "botToken", message: "m" }] }],
    ["no body", undefined],
    ["text", "oops"],
    ["a wrong shape", { errors: "nope" }],
  ])("asks for a reload when a 400 has %s to show", (_name, body) => {
    expect(respond(400, body)).toEqual({
      kind: "error",
      message: expect.stringContaining("reload"),
    });
  });

  it("explains a 429 and says how long to wait", () => {
    const outcome = respond(429, {}, "86400");

    expect(outcome).toEqual({ kind: "error", message: expect.stringContaining("limit") });
    expect(outcome.kind === "error" && outcome.message).toContain("about 24 hours");
  });

  it.each([null, "", "abc", "-5", "0", "1.5"])(
    "does not promise a wait for the Retry-After value %j",
    (retryAfter) => {
      const outcome = respond(429, {}, retryAfter);

      expect(outcome.kind === "error" && outcome.message).toContain("try again later");
    },
  );

  it.each([403, 503])("shows the server wording for %i", (status) => {
    expect(respond(status, { detail: "Fixed server text." })).toEqual({
      kind: "error",
      message: "Fixed server text.",
    });
  });

  it("falls back to a generic message when there is no readable body", () => {
    expect(respond(503)).toEqual({
      kind: "error",
      message: expect.stringContaining("Something went wrong"),
    });
    expect(respond(500, "<html>")).toEqual({
      kind: "error",
      message: expect.stringContaining("Something went wrong"),
    });
  });

  it.each([404, 413, 415])("asks for a reload on %i", (status) => {
    expect(respond(status)).toEqual({ kind: "error", message: expect.stringContaining("reload") });
  });
});

describe("submitTestSend", () => {
  const body = buildSendBody(values, "welcome", "tok");

  it("posts the body as JSON and reports success", async () => {
    const { fetch, calls } = createFakeFetch(() =>
      Response.json({ receiptId: "r" }, { status: 202 }),
    );

    const outcome = await submitTestSend(body, fetch);

    expect(outcome).toEqual({ kind: "sent" });
    const call = calls[0];
    expect(call?.url).toBe("/api/v1/test-sends");
    expect(call?.init.method).toBe("POST");
    expect(call && headerOf(call, "content-type")).toBe("application/json");
    expect(call && bodyOf(call)).toEqual(body);
  });

  it("reads Retry-After from a 429", async () => {
    const { fetch } = createFakeFetch(
      () => new Response("{}", { status: 429, headers: { "retry-after": "3600" } }),
    );

    const outcome = await submitTestSend(body, fetch);

    expect(outcome.kind === "error" && outcome.message).toContain("about an hour");
  });

  it("answers with a generic error when the server sends something that is not JSON", async () => {
    const { fetch } = createFakeFetch(() => new Response("<html>", { status: 502 }));

    const outcome = await submitTestSend(body, fetch);

    expect(outcome.kind === "error" && outcome.message).toContain("Something went wrong");
  });

  it("reports a connection problem when the request fails", async () => {
    const { fetch } = createFakeFetch(() => Promise.reject(new TypeError("Failed to fetch")));

    const outcome = await submitTestSend(body, fetch);

    expect(outcome.kind === "error" && outcome.message).toContain("connection");
  });
});
