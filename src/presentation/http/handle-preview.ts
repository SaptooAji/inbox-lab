import type { GetTemplate } from "@/application/use-cases/get-template";
import { isPreviewVariant, type PreviewVariant } from "../preview/preview-options";
import { problemResponse } from "./problem-details";

const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src https: data:",
  "frame-ancestors 'self'",
].join("; ");

const CACHE_CONTROL = "public, max-age=300, s-maxage=3600";

type TemplateLookup = Pick<GetTemplate, "execute">;

function notFound(): Response {
  return problemResponse({
    status: 404,
    code: "PREVIEW_NOT_FOUND",
    detail: "That preview does not exist.",
  });
}

function preview(body: string, variant: PreviewVariant): Response {
  return new Response(body, {
    headers: {
      "content-type": variant === "text" ? "text/plain; charset=utf-8" : "text/html; charset=utf-8",
      "content-security-policy": CONTENT_SECURITY_POLICY,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "cache-control": CACHE_CONTROL,
    },
  });
}

/** Serves one rendered version of a template. The template is resolved inside the try block. */
export async function handlePreview(
  id: string,
  variant: string,
  resolveGetTemplate: () => TemplateLookup,
): Promise<Response> {
  if (!isPreviewVariant(variant)) {
    return notFound();
  }

  try {
    const result = await resolveGetTemplate().execute(id);
    if (!result.ok) {
      return notFound();
    }
    const { html, darkHtml, text } = result.value;
    const bodies: Record<PreviewVariant, string> = { light: html, dark: darkHtml, text };
    return preview(bodies[variant], variant);
  } catch (error) {
    console.error("preview failed", {
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    return problemResponse({
      status: 500,
      code: "INTERNAL_ERROR",
      detail: "Something went wrong on our side. Please try again later.",
    });
  }
}
