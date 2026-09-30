import type { Result } from "@/domain/result";

export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new Error(`Expected an ok result but got: ${String(result.error)}`);
  }
  return result.value;
}

export function errorOf<T, E>(result: Result<T, E>): E {
  if (result.ok) {
    throw new Error("Expected an error result but got ok.");
  }
  return result.error;
}
