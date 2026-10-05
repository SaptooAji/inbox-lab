import { describe, expect, it } from "vitest";
import { problemResponse } from "@/presentation/http/problem-details";

const bodyOf = async (response: Response): Promise<unknown> => response.json();

describe("problemResponse", () => {
  it("builds an RFC 9457 problem response", async () => {
    const response = problemResponse({
      status: 404,
      code: "TEMPLATE_NOT_FOUND",
      detail: "That template does not exist.",
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await bodyOf(response)).toEqual({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "That template does not exist.",
      code: "TEMPLATE_NOT_FOUND",
    });
  });

  it("includes field errors when given", async () => {
    const errors = [{ field: "email", message: "Enter a valid email address." }];

    const response = problemResponse({ status: 400, code: "INVALID_REQUEST", detail: "d", errors });

    expect(await bodyOf(response)).toMatchObject({ title: "Bad Request", errors });
  });

  it("sets extra headers such as Retry-After", () => {
    const response = problemResponse({
      status: 429,
      code: "RATE_LIMITED",
      detail: "d",
      headers: { "Retry-After": "120" },
    });

    expect(response.headers.get("retry-after")).toBe("120");
    expect(response.headers.get("content-type")).toBe("application/problem+json");
  });
});
