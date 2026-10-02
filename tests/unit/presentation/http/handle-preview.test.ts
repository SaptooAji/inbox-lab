import { afterEach, describe, expect, it, vi } from "vitest";
import { GetTemplate } from "@/application/use-cases/get-template";
import { handlePreview } from "@/presentation/http/handle-preview";
import { aTemplate, FakeTemplateRenderer, FakeTemplateRepository } from "../../support/fakes";

const getTemplate = () =>
  new GetTemplate(new FakeTemplateRepository([aTemplate("welcome")]), new FakeTemplateRenderer());

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handlePreview", () => {
  it.each([
    ["light", "text/html; charset=utf-8", "<p>html</p>|Rina"],
    ["dark", "text/html; charset=utf-8", "<p>dark</p>|Rina"],
    ["text", "text/plain; charset=utf-8", "text|Rina"],
  ])("serves the %s variant", async (variant, contentType, body) => {
    const response = await handlePreview("welcome", variant, getTemplate);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(contentType);
    expect(await response.text()).toBe(body);
  });

  it("locks the preview down and lets it be cached", async () => {
    const response = await handlePreview("welcome", "light", getTemplate);

    const policy = response.headers.get("content-security-policy") ?? "";
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("frame-ancestors 'self'");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=3600");
  });

  it.each(["win-back", "../etc/passwd", ""])("answers 404 for the id %j", async (id) => {
    const response = await handlePreview(id, "light", getTemplate);

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
  });

  it("answers 404 for an unknown variant without loading any template", async () => {
    const resolve = vi.fn(getTemplate);

    const response = await handlePreview("welcome", "sepia", resolve);

    expect(response.status).toBe(404);
    expect(resolve).not.toHaveBeenCalled();
  });

  it("answers 500, logs it, and keeps internals out of the body", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await handlePreview("welcome", "light", () => {
      throw new Error("dist is missing at /secret/path");
    });

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret");
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
