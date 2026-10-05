const UNKNOWN = "unknown";
const MAX_LENGTH = 64;

/**
 * Clients we cannot identify share one rate-limit bucket, which fails in the safe direction.
 * Only trust these headers behind a proxy that overwrites them (verify this on your host).
 */
export function getClientIp(headers: Headers): string {
  const candidates = [headers.get("x-real-ip"), headers.get("x-forwarded-for")?.split(",")[0]];
  const found = candidates
    .map((candidate) => candidate?.trim() ?? "")
    .find((value) => value !== "");
  return found === undefined || found.length > MAX_LENGTH ? UNKNOWN : found;
}
