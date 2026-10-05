/** The part of fetch the adapters use. It is injected, so tests never touch the network. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export const HTTP_TIMEOUT_MS = 8_000;
