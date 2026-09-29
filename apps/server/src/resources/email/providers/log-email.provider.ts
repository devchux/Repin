import { Injectable, Logger } from '@nestjs/common';
import { EmailMessage, EmailProvider } from '../email.types';

@Injectable()
export class LogEmailProvider implements EmailProvider {
  private readonly logger = new Logger(LogEmailProvider.name);

  async send(message: EmailMessage) {
    this.logger.log(
      `Development email to ${message.to.email}: ${message.text}`,
    );
  }
}
