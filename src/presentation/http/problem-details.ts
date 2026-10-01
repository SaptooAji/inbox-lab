const TITLES = {
  400: "Bad Request",
  403: "Forbidden",
  404: "Not Found",
  413: "Content Too Large",
  415: "Unsupported Media Type",
  429: "Too Many Requests",
  500: "Internal Server Error",
  503: "Service Unavailable",
} as const;

export type ProblemStatus = keyof typeof TITLES;

export interface FieldIssue {
  readonly field: string;
  readonly message: string;
}

export interface ProblemOptions {
  readonly status: ProblemStatus;
  /** Stable machine-readable code that clients can switch on. */
  readonly code: string;
  /** Safe to show to the visitor. Never put user input or internal messages here. */
  readonly detail: string;
  readonly errors?: readonly FieldIssue[] | undefined;
  readonly headers?: Readonly<Record<string, string>> | undefined;
}

/** RFC 9457 problem details. With type "about:blank" the title is the HTTP status phrase. */
export function problemResponse(options: ProblemOptions): Response {
  const body = {
    type: "about:blank",
    title: TITLES[options.status],
    status: options.status,
    detail: options.detail,
    code: options.code,
    ...(options.errors === undefined ? {} : { errors: options.errors }),
  };
  return new Response(JSON.stringify(body), {
    status: options.status,
    headers: {
      ...options.headers,
      "content-type": "application/problem+json",
      "cache-control": "no-store",
    },
  });
}
