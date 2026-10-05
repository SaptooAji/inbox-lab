/** True for the "file or folder does not exist" error from node:fs. */
export function isNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
