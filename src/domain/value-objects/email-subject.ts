import { ValidationError } from "../errors/validation-error";
import { err, ok, type Result } from "../result";

const MAX_LENGTH = 80;
// Control characters and Unicode line/paragraph separators enable header injection.
const FORBIDDEN = /[\p{Cc}\p{Zl}\p{Zp}]/u;

export class EmailSubject {
  private constructor(readonly value: string) {}

  static create(raw: string): Result<EmailSubject, ValidationError> {
    const value = raw.trim();

    if (value.length === 0 || value.length > MAX_LENGTH || FORBIDDEN.test(value)) {
      return err(new ValidationError("subject", "Use 1 to 80 characters, without line breaks."));
    }
    return ok(new EmailSubject(value));
  }
}
