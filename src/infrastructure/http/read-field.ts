/** Reads one property of an untrusted JSON value without assuming its shape. */
export function readField(source: unknown, key: string): unknown {
  return typeof source === "object" && source !== null ? Reflect.get(source, key) : undefined;
}
