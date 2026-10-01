export interface TokenTree {
  readonly [key: string]: string | number | TokenTree;
}

export function flattenTokens(tree: TokenTree, prefix = ""): Map<string, string> {
  const flat = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof value === "object") {
      for (const [nestedPath, nestedValue] of flattenTokens(value, path)) {
        flat.set(nestedPath, nestedValue);
      }
    } else {
      flat.set(path, String(value));
    }
  }
  return flat;
}
