export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class ValidationError extends DomainError {
  constructor(
    message: string,
    readonly issues: readonly string[],
  ) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}
