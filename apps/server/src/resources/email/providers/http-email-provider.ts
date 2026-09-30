import { EmailAddress, EmailMessage, EmailProvider } from '../email.types';

export abstract class HttpEmailProvider implements EmailProvider {
  protected constructor(
    private readonly endpoint: string,
    private readonly authorization: string,
    protected readonly from: EmailAddress,
  ) {}

  protected abstract payload(message: EmailMessage): object;

  async send(message: EmailMessage) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: this.authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.payload(message)),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(
        `Email provider rejected the message (${response.status}): ${detail}`,
      );
    }
  }

  protected formatAddress(address: EmailAddress) {
    return address.name ? `${address.name} <${address.email}>` : address.email;
  }
}
