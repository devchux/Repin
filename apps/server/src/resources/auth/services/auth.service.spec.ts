import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import { AuthService } from './auth.service';
import { AuthEmailService } from './auth-email.service';
import { UserService } from '../../user/user.service';
import { AuthTokenService } from './auth-token.service';
import { ExtensionAuthService } from './extension-auth.service';
import { AuthCodePurpose, Status } from 'src/shared/types';
import { hashAuthCode } from 'src/shared/utils/helper';

describe('AuthService', () => {
  let service: AuthService;
  let cache: jest.Mocked<
    Pick<CacheService, 'deleteValue' | 'getValue' | 'setValue'>
  >;
  let email: jest.Mocked<Pick<AuthEmailService, 'sendAuthCode'>>;
  let tokens: jest.Mocked<Pick<AuthTokenService, 'createAuthTokens'>>;
  let users: jest.Mocked<
    Pick<
      UserService,
      | 'activateUser'
      | 'createPendingRegistration'
      | 'findOneByEmail'
      | 'findOne'
      | 'updateEmail'
    >
  >;

  beforeEach(() => {
    cache = {
      deleteValue: jest.fn(),
      getValue: jest.fn(),
      setValue: jest.fn(),
    };
    email = { sendAuthCode: jest.fn() };
    tokens = { createAuthTokens: jest.fn() };
    users = {
      activateUser: jest.fn(),
      createPendingRegistration: jest.fn(),
      findOneByEmail: jest.fn(),
      findOne: jest.fn(),
      updateEmail: jest.fn(),
    };
    const config = {
      get: jest.fn((key: string) =>
        key === 'nodeEnv' ? 'development' : 'test-access-secret',
      ),
    };
    service = new AuthService(
      tokens as unknown as AuthTokenService,
      cache as unknown as CacheService,
      config as unknown as ConfigService,
      {} as ExtensionAuthService,
      email as unknown as AuthEmailService,
      users as unknown as UserService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('delivers registration codes through the email abstraction', async () => {
    const user = {
      id: 1,
      email: 'person@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      status: Status.INACTIVE,
    };
    users.createPendingRegistration.mockResolvedValue(user as never);

    const result = await service.register({
      email: ' Person@example.com ',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(cache.setValue).toHaveBeenCalled();
    expect(email.sendAuthCode).toHaveBeenCalledWith(
      'person@example.com',
      expect.stringMatching(/^\d{6}$/),
      AuthCodePurpose.REGISTER,
      'Ada',
    );
    expect(result.data.mockCode).toMatch(/^\d{6}$/);
  });

  it('changes email only after the new address code is verified', async () => {
    const code = '123456';
    cache.getValue.mockResolvedValue({
      codeHash: hashAuthCode('new@example.com', code, 'test-access-secret'),
      email: 'new@example.com',
      purpose: AuthCodePurpose.CHANGE_EMAIL,
    });
    const updated = {
      id: 1,
      email: 'new@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      status: Status.ACTIVE,
    };
    users.updateEmail.mockResolvedValue({
      message: 'Email address changed successfully',
      data: updated,
    } as never);
    tokens.createAuthTokens.mockResolvedValue({
      token: 'access',
      refreshToken: 'refresh',
    });

    const result = await service.confirmEmailChange(
      { id: 1, email: 'old@example.com', isSuper: false },
      { code },
    );

    expect(users.updateEmail).toHaveBeenCalledWith(1, 'new@example.com');
    expect(cache.deleteValue).toHaveBeenCalledWith('email-change-code:1');
    expect(result.data.user.email).toBe('new@example.com');
  });
});
