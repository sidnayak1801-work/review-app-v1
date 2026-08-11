export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Deterministic key for provider-level idempotency when supported. */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  providerMessageId?: string;
}

export interface EmailProvider {
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}

export class EmailProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "EmailProviderError";
  }
}
