import { z } from "zod";

export const FORM_FIELDS = ["email", "firstName", "subject", "consent"] as const;
export type FormField = (typeof FORM_FIELDS)[number];

export interface SendFormValues {
  readonly email: string;
  readonly firstName: string;
  readonly subject: string;
  readonly consent: boolean;
  readonly website: string;
}

export interface SendBody {
  readonly email: string;
  readonly firstName: string;
  readonly subject?: string;
  readonly templateId: string;
  readonly consent: boolean;
  readonly botToken: string;
  readonly website: string;
}

export type SendOutcome =
  | { readonly kind: "sent" }
  | {
      readonly kind: "invalid";
      readonly message: string;
      readonly fieldErrors: Readonly<Partial<Record<FormField, string>>>;
    }
  | { readonly kind: "error"; readonly message: string };

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export const TEST_SENDS_PATH = "/api/v1/test-sends";

const FIX_FIELDS = "Please fix the highlighted fields.";
const RELOAD = "The request could not be sent. Please reload the page and try again.";
const GENERIC = "Something went wrong. Please try again in a moment.";
const NETWORK = "We could not reach the server. Check your connection and try again.";
const LIMIT = "You have reached the limit for test emails.";
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;

const problemSchema = z.object({
  detail: z.string().optional(),
  errors: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
});

export function buildSendBody(
  values: SendFormValues,
  templateId: string,
  botToken: string,
): SendBody {
  const subject = values.subject.trim();
  return {
    email: values.email.trim(),
    firstName: values.firstName.trim(),
    templateId,
    consent: values.consent,
    botToken,
    website: values.website,
    ...(subject === "" ? {} : { subject }),
  };
}

export function describeWait(seconds: number): string {
  if (seconds <= SECONDS_PER_MINUTE) {
    return "a minute";
  }
  const minutes = Math.ceil(seconds / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes} minutes`;
  }
  const hours = Math.ceil(minutes / MINUTES_PER_HOUR);
  return hours === 1 ? "an hour" : `${hours} hours`;
}

function isFormField(field: string): field is FormField {
  return (FORM_FIELDS as readonly string[]).includes(field);
}

function invalid(issues: readonly { field: string; message: string }[]): SendOutcome {
  const fieldErrors: Partial<Record<FormField, string>> = {};
  for (const issue of issues) {
    if (isFormField(issue.field) && fieldErrors[issue.field] === undefined) {
      fieldErrors[issue.field] = issue.message;
    }
  }
  return Object.keys(fieldErrors).length === 0
    ? { kind: "error", message: RELOAD }
    : { kind: "invalid", message: FIX_FIELDS, fieldErrors };
}

function limitMessage(retryAfter: string | null): string {
  const seconds = Number(retryAfter);
  if (retryAfter === null || !Number.isInteger(seconds) || seconds <= 0) {
    return `${LIMIT} Please try again later.`;
  }
  return `${LIMIT} Try again in about ${describeWait(seconds)}.`;
}

export interface SendResponse {
  readonly status: number;
  readonly body: unknown;
  readonly retryAfter: string | null;
}

/** Only fixed wording we control reaches the visitor; unknown failures get a generic message. */
export function interpretSendResponse(response: SendResponse): SendOutcome {
  if (response.status === 202) {
    return { kind: "sent" };
  }

  const problem = problemSchema.safeParse(response.body);
  const detail = problem.success ? problem.data.detail : undefined;

  if (response.status === 400) {
    return invalid(problem.success ? (problem.data.errors ?? []) : []);
  }
  if (response.status === 429) {
    return { kind: "error", message: limitMessage(response.retryAfter) };
  }
  if (response.status === 403 || response.status >= 500) {
    return { kind: "error", message: detail ?? GENERIC };
  }
  return { kind: "error", message: RELOAD };
}

export async function submitTestSend(body: SendBody, fetcher: Fetcher): Promise<SendOutcome> {
  try {
    const response = await fetcher(TEST_SENDS_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json: unknown = await response.json().catch(() => undefined);
    return interpretSendResponse({
      status: response.status,
      body: json,
      retryAfter: response.headers.get("retry-after"),
    });
  } catch {
    return { kind: "error", message: NETWORK };
  }
}
