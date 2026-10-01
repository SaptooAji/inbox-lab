import type { FetchLike } from "@/infrastructure/http/fetch-like";

export interface RecordedCall {
  readonly url: string;
  readonly init: RequestInit;
}

export type FakeHandler = (call: RecordedCall) => Response | Promise<Response>;

export function createFakeFetch(handler: FakeHandler): { fetch: FetchLike; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetch: FetchLike = (url, init) => {
    const call = { url, init };
    calls.push(call);
    return Promise.resolve(handler(call));
  };
  return { fetch, calls };
}

export function bodyOf(call: RecordedCall): unknown {
  const body = call.init.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

export function headerOf(call: RecordedCall, name: string): string | null {
  return new Headers(call.init.headers).get(name);
}
