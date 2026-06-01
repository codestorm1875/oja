export type EmailProvider = 'mock' | 'smtp' | 'resend' | 'sendgrid';

export type EmailDeliveryStatus = 'sent' | 'failed';

export type SendEmailInput = {
  tenantId: string;
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
};

export type EmailProviderResult = {
  provider: EmailProvider;
  providerMessageId: string;
  status: EmailDeliveryStatus;
};

export type EmailProviderAdapter = {
  readonly provider: EmailProvider;
  send(input: SendEmailInput): EmailProviderResult;
};

class MockEmailProviderAdapter implements EmailProviderAdapter {
  readonly provider = 'mock' satisfies EmailProvider;

  send(): EmailProviderResult {
    return {
      provider: this.provider,
      providerMessageId: `mock_email_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      status: 'sent',
    };
  }
}

export const emailProviderAdapters: EmailProviderAdapter[] = [
  new MockEmailProviderAdapter(),
];
