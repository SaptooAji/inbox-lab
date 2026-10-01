import type { Logger } from "@/application/ports/logger";
import type { SendTestEmail } from "@/application/use-cases/send-test-email";
import { err, ok, type Result } from "@/domain/result";
import { getClientIp } from "./client-ip";
import { toProblem } from "./map-error-to-http";
import { problemResponse } from "./problem-details";
import { parseTestSendBody } from "./request-schemas";

const MAX_BODY_CHARS = 8 * 1024;
const OPERATIONAL_FAILURES: ReadonlySet<string> = new Set([
  "EMAIL_DELIVERY_FAILED",
  "DAILY_CAP_REACHED",
]);

export interface TestSendHandlerDeps {
  readonly sendTestEmail: Pick<SendTestEmail, "execute">;
  readonly logger: Logger;
}

function isJson(contentType: string | null): boolean {
  return contentType?.toLowerCase().startsWith("application/json") ?? false;
}

function parseJson(raw: string): Result<unknown, "invalid-json"> {
  try {
    const value: unknown = JSON.parse(raw);
    return ok(value);
  } catch {
    return err("invalid-json");
  }
}

async function handle(request: Request, deps: TestSendHandlerDeps): Promise<Response> {
  if (!isJson(request.headers.get("content-type"))) {
    return problemResponse({
      status: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
      detail: "Send the request as application/json.",
    });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) {
    return problemResponse({
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      detail: "The request body is too large.",
    });
  }

  const json = parseJson(raw);
  if (!json.ok) {
    return problemResponse({
      status: 400,
      code: "INVALID_JSON",
      detail: "The request body is not valid JSON.",
    });
  }

  const body = parseTestSendBody(json.value);
  if (!body.ok) {
    return problemResponse({
      status: 400,
      code: "INVALID_REQUEST",
      detail: "The request contains invalid fields.",
      errors: body.error,
    });
  }

  const result = await deps.sendTestEmail.execute({
    ...body.value,
    clientIp: getClientIp(request.headers),
  });

  if (result.ok) {
    return Response.json(
      { receiptId: result.value.receiptId },
      { status: 202, headers: { "cache-control": "no-store" } },
    );
  }
  if (OPERATIONAL_FAILURES.has(result.error.code)) {
    deps.logger.warn("a test send was not delivered", { code: result.error.code });
  }
  return problemResponse(toProblem(result.error));
}

function reportUnexpected(logger: Logger | undefined, error: unknown): void {
  const context = {
    errorName: error instanceof Error ? error.name : "unknown",
    errorMessage: error instanceof Error ? error.message : "unknown",
  };
  if (logger === undefined) {
    console.error("unexpected error before the logger was ready", context);
  } else {
    logger.error("unexpected error while handling a test send", context);
  }
}

/**
 * The container is resolved inside the try block, so a configuration failure becomes
 * a clean 500 with nothing internal in the body.
 */
export async function handleTestSend(
  request: Request,
  resolveDeps: () => TestSendHandlerDeps,
): Promise<Response> {
  let logger: Logger | undefined;
  try {
    const deps = resolveDeps();
    logger = deps.logger;
    return await handle(request, deps);
  } catch (error) {
    reportUnexpected(logger, error);
    return problemResponse({
      status: 500,
      code: "INTERNAL_ERROR",
      detail: "Something went wrong on our side. Please try again later.",
    });
  }
}
