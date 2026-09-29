export type EmailAddress = {
  readonly email: string;
  readonly name?: string;
};

export type EmailMessage = {
  readonly to: EmailAddress;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
