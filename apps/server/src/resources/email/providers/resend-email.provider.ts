import { EmailMessage } from '../email.types';
import { HttpEmailProvider } from './http-email-provider';

export class ResendEmailProvider extends HttpEmailProvider {
  constructor(apiKey: string, fromEmail: string, fromName: string) {
    super('https://api.resend.com/emails', `Bearer ${apiKey}`, {
      email: fromEmail,
      name: fromName,
    });
  }

  protected payload(message: EmailMessage) {
    return {
      from: this.formatAddress(this.from),
      to: [this.formatAddress(message.to)],
      subject: message.subject,
      text: message.text,
      html: message.html,
    };
  }
}
