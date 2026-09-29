import nodemailer, { Transporter } from 'nodemailer';
import { EmailAddress, EmailMessage, EmailProvider } from '../email.types';

type SmtpOptions = {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user?: string;
  readonly password?: string;
  readonly from: EmailAddress;
};

export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;

  constructor(private readonly options: SmtpOptions) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      ...(options.user && options.password
        ? { auth: { user: options.user, pass: options.password } }
        : {}),
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  async send(message: EmailMessage) {
    await this.transporter.sendMail({
      from: {
        address: this.options.from.email,
        name: this.options.from.name ?? '',
      },
      to: { address: message.to.email, name: message.to.name ?? '' },
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
