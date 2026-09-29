import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from 'src/shared/types';
import { EMAIL_PROVIDER, EmailProvider } from './email.types';
import { EmailService } from './email.service';
import { LogEmailProvider } from './providers/log-email.provider';
import { ResendEmailProvider } from './providers/resend-email.provider';
import { SendGridEmailProvider } from './providers/sendgrid-email.provider';
import { SmtpEmailProvider } from './providers/smtp-email.provider';

const emailProviderFactory = (
  config: ConfigService<Configuration, true>,
): EmailProvider => {
  const email = config.get('email', { infer: true });
  switch (email.provider) {
    case 'resend':
      return new ResendEmailProvider(
        email.resendApiKey,
        email.fromAddress,
        email.fromName,
      );
    case 'sendgrid':
      return new SendGridEmailProvider(
        email.sendGridApiKey,
        email.fromAddress,
        email.fromName,
      );
    case 'smtp':
      return new SmtpEmailProvider({
        host: email.smtp.host,
        port: email.smtp.port,
        secure: email.smtp.secure,
        user: email.smtp.user,
        password: email.smtp.password,
        from: { email: email.fromAddress, name: email.fromName },
      });
    case 'log':
      return new LogEmailProvider();
  }
};

@Module({
  providers: [
    EmailService,
    {
      provide: EMAIL_PROVIDER,
      inject: [ConfigService],
      useFactory: emailProviderFactory,
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
