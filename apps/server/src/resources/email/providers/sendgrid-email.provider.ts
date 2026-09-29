import { EmailMessage } from '../email.types';
import { HttpEmailProvider } from './http-email-provider';

export class SendGridEmailProvider extends HttpEmailProvider {
  constructor(apiKey: string, fromEmail: string, fromName: string) {
    super('https://api.sendgrid.com/v3/mail/send', `Bearer ${apiKey}`, {
      email: fromEmail,
      name: fromName,
    });
  }

  protected payload(message: EmailMessage) {
    return {
      personalizations: [{ to: [message.to] }],
      from: this.from,
      subject: message.subject,
      content: [
        { type: 'text/plain', value: message.text },
        { type: 'text/html', value: message.html },
      ],
    };
  }
}
