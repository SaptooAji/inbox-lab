import { createHmac } from "node:crypto";
import type { IdentityHasher } from "@/application/ports/identity-hasher";

const MIN_SALT_LENGTH = 16;

/** One-way keyed hash, so rate-limit keys never contain a raw email address or IP. */
export class HmacIdentityHasher implements IdentityHasher {
  constructor(private readonly salt: string) {
    if (salt.length < MIN_SALT_LENGTH) {
      throw new Error(
        `The identity hash salt must be at least ${MIN_SALT_LENGTH} characters long.`,
      );
    }
  }

  hash(value: string): string {
    return createHmac("sha256", this.salt).update(value).digest("hex");
  }
}
