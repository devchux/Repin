import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email.types';
import type { EmailMessage, EmailProvider } from './email.types';

@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
  ) {}

  send(message: EmailMessage) {
    return this.provider.send(message);
  }
}
