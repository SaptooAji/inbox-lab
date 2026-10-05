export interface PublicConfig {
  readonly turnstileSiteKey: string | undefined;
}

/** Only values that are safe to show to every visitor belong here. */
export function parsePublicConfig(env: Readonly<Record<string, string | undefined>>): PublicConfig {
  const key = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return { turnstileSiteKey: key === undefined || key === "" ? undefined : key };
}
