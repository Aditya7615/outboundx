import { randomUUID } from "node:crypto";

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  campaignId: number;
  contactId: number;
}

export interface SendEmailResult {
  messageId: string;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

/**
 * Mock provider that behaves like a transactional email API (for example
 * SendGrid, Resend or SES). Swapping this class for a real HTTP client is the
 * only change required to go live.
 */
export class MockEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!input.to.includes("@")) {
      throw new Error(`Invalid recipient address: ${input.to}`);
    }

    return { messageId: `mock_${randomUUID()}` };
  }
}

export const emailProvider: EmailProvider = new MockEmailProvider();
