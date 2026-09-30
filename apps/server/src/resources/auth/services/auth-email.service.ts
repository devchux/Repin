import { Injectable } from '@nestjs/common';
import { AuthCodePurpose } from 'src/shared/types';
import { EmailService } from '../../email/email.service';

@Injectable()
export class AuthEmailService {
  constructor(private readonly emailService: EmailService) {}

  sendAuthCode(
    email: string,
    code: string,
    purpose: AuthCodePurpose,
    firstName?: string,
  ) {
    const title = this.titleFor(purpose);
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
    const instruction = this.instructionFor(purpose);
    const text = `${greeting}\n\n${instruction}\n\n${code}\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.`;
    const html = `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;background:#f6f7f9;color:#171717;font-family:Arial,sans-serif">
          <div style="max-width:560px;margin:0 auto;padding:40px 20px">
            <div style="background:#fff;border:1px solid #e7e7e7;border-radius:14px;padding:32px">
              <p style="margin:0 0 18px;font-size:16px">${this.escape(greeting)}</p>
              <h1 style="margin:0 0 12px;font-size:24px">${this.escape(title)}</h1>
              <p style="margin:0 0 24px;color:#555;line-height:1.6">${this.escape(instruction)}</p>
              <div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:18px 20px;background:#f2f3f5;border-radius:10px;text-align:center">${code}</div>
              <p style="margin:24px 0 0;color:#777;font-size:13px;line-height:1.5">This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
            </div>
          </div>
        </body>
      </html>`;

    return this.emailService.send({
      to: { email },
      subject: title,
      text,
      html,
    });
  }

  private titleFor(purpose: AuthCodePurpose) {
    switch (purpose) {
      case AuthCodePurpose.LOGIN:
        return 'Your Repin sign-in code';
      case AuthCodePurpose.REGISTER:
        return 'Verify your Repin account';
      case AuthCodePurpose.CHANGE_EMAIL:
        return 'Confirm your new Repin email';
    }
  }

  private instructionFor(purpose: AuthCodePurpose) {
    switch (purpose) {
      case AuthCodePurpose.LOGIN:
        return 'Use this code to sign in to Repin.';
      case AuthCodePurpose.REGISTER:
        return 'Use this code to finish creating your Repin account.';
      case AuthCodePurpose.CHANGE_EMAIL:
        return 'Use this code to confirm this as the new email address for your Repin account.';
    }
  }

  private escape(value: string) {
    return value.replace(
      /[&<>'"]/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
        })[character]!,
    );
  }
}
