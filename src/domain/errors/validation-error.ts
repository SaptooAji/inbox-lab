import { DomainError } from "./domain-error";

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";

  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}
