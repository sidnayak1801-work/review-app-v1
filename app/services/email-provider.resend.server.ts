import { logger } from "./logger.server";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "./email-provider.server";
import { EmailProviderError } from "./email-provider.server";

export class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    logger.info("Review request email (console provider)", {
      toDomain: input.to.split("@")[1] ?? "unknown",
      subject: input.subject,
    });

    return { providerMessageId: "console" };
  }
}

export function createConsoleEmailProvider(): EmailProvider {
  return new ConsoleEmailProvider();
}

export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fromAddress: string,
  ) {}

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!response.ok) {
      throw new EmailProviderError(
        "Email provider rejected the message.",
        `RESEND_${response.status}`,
      );
    }

    const payload = (await response.json()) as { id?: string };

    return {
      providerMessageId: payload.id,
    };
  }
}

export function createResendEmailProvider(input: {
  apiKey: string;
  fromAddress: string;
}): EmailProvider {
  return new ResendEmailProvider(input.apiKey, input.fromAddress);
}
