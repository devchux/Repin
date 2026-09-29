import { EmailService } from '../../email/email.service';
import { AuthCodePurpose } from 'src/shared/types';
import { AuthEmailService } from './auth-email.service';

describe('AuthEmailService', () => {
  it('renders a provider-neutral login email', async () => {
    const email = { send: jest.fn().mockResolvedValue(undefined) };
    const service = new AuthEmailService(email as unknown as EmailService);

    await service.sendAuthCode(
      'person@example.com',
      '123456',
      AuthCodePurpose.LOGIN,
      'Ada',
    );

    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: { email: 'person@example.com' },
        subject: 'Your Repin sign-in code',
        text: expect.stringContaining('123456'),
        html: expect.stringContaining('123456'),
      }),
    );
  });

  it('escapes user-controlled names in HTML', async () => {
    const email = { send: jest.fn().mockResolvedValue(undefined) };
    const service = new AuthEmailService(email as unknown as EmailService);

    await service.sendAuthCode(
      'person@example.com',
      '123456',
      AuthCodePurpose.REGISTER,
      '<script>',
    );

    expect(email.send.mock.calls[0][0].html).toContain('&lt;script&gt;');
    expect(email.send.mock.calls[0][0].html).not.toContain('<script>');
  });
});
