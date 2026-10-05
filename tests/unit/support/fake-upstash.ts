import type { Clock } from "@/application/ports/clock";
import type { FetchLike } from "@/infrastructure/http/fetch-like";

interface Entry {
  value: number;
  readonly expiresAt: number | null;
}

type Command = readonly string[];

/** A stand-in for Upstash's /multi-exec endpoint, covering only the commands the limiter uses. */
export class FakeUpstash {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly token: string,
    private readonly clock: Clock,
  ) {}

  readonly fetch: FetchLike = (url, init) => {
    if (new Headers(init.headers).get("authorization") !== `Bearer ${this.token}`) {
      return Promise.resolve(Response.json({ error: "unauthorized" }, { status: 401 }));
    }
    if (!url.endsWith("/multi-exec")) {
      return Promise.resolve(Response.json({ error: "not found" }, { status: 404 }));
    }
    const raw = typeof init.body === "string" ? init.body : "[]";
    const commands = JSON.parse(raw) as Command[];
    return Promise.resolve(
      Response.json(commands.map((command) => ({ result: this.run(command) }))),
    );
  };

  private live(key: string, now: number): Entry | undefined {
    const entry = this.entries.get(key);
    return entry !== undefined && (entry.expiresAt === null || entry.expiresAt > now)
      ? entry
      : undefined;
  }

  private run(command: Command): string | number | null {
    const [name, key = "", ...args] = command;
    const now = this.clock.now().getTime();
    const live = this.live(key, now);

    switch (name) {
      case "SET": {
        // SET key value EX seconds NX
        const [value = "0", , seconds = "0"] = args;
        if (live !== undefined) {
          return null;
        }
        this.entries.set(key, { value: Number(value), expiresAt: now + Number(seconds) * 1000 });
        return "OK";
      }
      case "INCR": {
        const entry = live ?? { value: 0, expiresAt: null };
        entry.value += 1;
        this.entries.set(key, entry);
        return entry.value;
      }
      case "TTL": {
        if (live === undefined) {
          return -2;
        }
        return live.expiresAt === null ? -1 : Math.ceil((live.expiresAt - now) / 1000);
      }
      default:
        throw new Error(`FakeUpstash does not support ${String(name)}.`);
    }
  }
}
