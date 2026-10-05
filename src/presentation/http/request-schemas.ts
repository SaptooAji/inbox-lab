import { z } from "zod";
import { err, ok, type Result } from "@/domain/result";
import type { FieldIssue } from "./problem-details";

/**
 * Shape and size only. The edge caps are deliberately looser than the domain rules,
 * so the domain's specific messages ("Use 1 to 40 letters...") reach the visitor.
 */
const schema = z.object({
  email: z.string().max(320),
  firstName: z.string().max(200),
  subject: z.string().max(500).optional(),
  templateId: z.string().max(100),
  consent: z.boolean(),
  botToken: z.string().max(4096),
  website: z.string().max(500).default(""),
});

export type TestSendBody = z.infer<typeof schema>;

type SchemaIssue = z.ZodError["issues"][number];

const TOO_LONG = "This value is too long.";
const WRONG_TYPE = "This field is missing or has the wrong type.";

function toFieldIssue(issue: SchemaIssue): FieldIssue {
  return {
    field: issue.path.length === 0 ? "body" : issue.path.map(String).join("."),
    message: issue.code === "too_big" ? TOO_LONG : WRONG_TYPE,
  };
}

export function parseTestSendBody(raw: unknown): Result<TestSendBody, readonly FieldIssue[]> {
  const parsed = schema.safeParse(raw);
  return parsed.success ? ok(parsed.data) : err(parsed.error.issues.map(toFieldIssue));
}
