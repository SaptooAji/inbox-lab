import { ValidationError } from "../errors/validation-error";
import { err, ok, type Result } from "../result";

const MAX_LENGTH = 40;
// A letter first, then letters, combining marks, plain spaces, hyphens or apostrophes.
const PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} '’-]*$/u;

export class RecipientName {
  private constructor(readonly value: string) {}

  static create(raw: string): Result<RecipientName, ValidationError> {
    const value = raw.trim();

    if (value.length === 0 || value.length > MAX_LENGTH || !PATTERN.test(value)) {
      return err(
        new ValidationError("firstName", "Use 1 to 40 letters, spaces, hyphens or apostrophes."),
      );
    }
    return ok(new RecipientName(value));
  }
}
