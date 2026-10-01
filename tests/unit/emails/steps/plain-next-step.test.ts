import { describe, expect, it } from "vitest";
import { PlainTextStep } from "../../../../emails/build/steps/plain-text-step";

const run = (body: string) =>
  new PlainTextStep().run({ name: "welcome", html: `<html><body>${body}</body></html>` });

describe("PlainTextStep", () => {
  it("adds a text version without changing the html", () => {
    const html = "<html><body><p>Hi</p></body></html>";

    const result = new PlainTextStep().run({ name: "welcome", html });

    expect(result.html).toBe(html);
    expect(result.text).toContain("Hi");
  });

  it("keeps heading case and merge tags", () => {
    const text = run("<h1>Welcome aboard</h1><p>Hello {{firstName}}</p>").text;

    expect(text).toContain("Welcome aboard");
    expect(text).toContain("Hello {{firstName}}");
  });

  it("shows where a link goes", () => {
    const text = run('<a href="https://example.com/start">Get started</a>').text;

    expect(text).toContain("Get started");
    expect(text).toContain("https://example.com/start");
  });

  it("decodes html entities", () => {
    expect(run("<p>Fish &amp; chips</p>").text).toContain("Fish & chips");
  });

  it("leaves out elements marked data-text-skip, such as the preheader", () => {
    const text = run("<div data-text-skip>hidden preview text</div><p>Visible</p>").text;

    expect(text).not.toContain("hidden preview text");
    expect(text).toContain("Visible");
  });
});
