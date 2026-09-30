import { ValidationError } from "../errors/validation-error";
import { err, ok, type Result } from "../result";

const MAX_LENGTH = 254;
const PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailAddress {
  private constructor(readonly value: string) {}

  static create(raw: string): Result<EmailAddress, ValidationError> {
    const value = raw.trim().toLowerCase();

    if (value.length === 0 || value.length > MAX_LENGTH || !PATTERN.test(value)) {
      return err(new ValidationError("email", "Enter a valid email address."));
    }
    return ok(new EmailAddress(value));
  }
}
