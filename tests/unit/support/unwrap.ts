import type { Result } from "@/domain/result";

export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new Error(`Expected an ok result but got: ${String(result.error)}`);
  }
  return result.value;
}
