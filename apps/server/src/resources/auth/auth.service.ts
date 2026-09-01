import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import {
  AUTH_COOKIE_NAME,
  REFRESH_AUTH_COOKIE_NAME,
} from 'src/config/constants';
import {
  AuthCodePurpose,
  AuthUser,
  Status,
  StoredAuthCode,
} from 'src/shared/types';
import {
  getAuthCodeKey,
  hashAuthCode,
  hashToken,
  isHashMatch,
  normalizeEmail,
} from 'src/shared/utils/helper';
import { CacheService } from '../cache/cache.service';
import { UserService } from '../user/user.service';
import { AuthorizeExtensionDto } from './dto/authorize-extension.dto';
import { ExchangeExtensionCodeDto } from './dto/exchange-extension-code.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { MockMailService } from './mock-mail.service';
import { AuthTokenService } from './services/auth-token.service';
import { ExtensionAuthService } from './services/extension-auth.service';
import { AUTH_CODE_TTL_MS, createAuthCodeResponse } from './utils/auth.utils';

@Injectable()
export class AuthService {
  constructor(
    private readonly authTokenService: AuthTokenService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly extensionAuthService: ExtensionAuthService,
    private readonly mockMailService: MockMailService,
    private readonly userService: UserService,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = normalizeEmail(registerDto.email);
    const user = await this.userService.createPendingRegistration({
      ...registerDto,
      email,
    });
    const code = await this.createAndSendCode(email, AuthCodePurpose.REGISTER);
    return this.authCodeResponse(
      'Registration code sent successfully',
      user,
      code,
    );
  }

  async login(loginDto: LoginDto) {
    const email = normalizeEmail(loginDto.email);
    const user = await this.userService.findOneByEmail(email);
    if (!user || user.status === Status.DELETED) {
      throw new BadRequestException('User not found');
    }
    if (user.status !== Status.ACTIVE) {
      throw new BadRequestException('Please verify your registration first');
    }

    const code = await this.createAndSendCode(email, AuthCodePurpose.LOGIN);
    return this.authCodeResponse('Login code sent successfully', user, code);
  }

  async verifyCode(verifyCodeDto: VerifyCodeDto) {
    const email = normalizeEmail(verifyCodeDto.email);
    const authCode = await this.cacheService.getValue<StoredAuthCode>(
      getAuthCodeKey(email),
    );
    if (!authCode || !this.isValidCode(email, verifyCodeDto.code, authCode)) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    await this.cacheService.deleteValue(getAuthCodeKey(email));
    const user = await this.userService.findOneByEmail(email);
    if (!user || user.status === Status.DELETED) {
      throw new UnauthorizedException('User not found');
    }

    const activeUser =
      authCode.purpose === AuthCodePurpose.REGISTER
        ? await this.userService.activateUser(user.id)
        : user;
    if (activeUser.status !== Status.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }

    const tokens = await this.authTokenService.createAuthTokens(activeUser);
    return {
      message: 'Code verified successfully',
      data: {
        user: activeUser,
        ...tokens,
        cookieName: AUTH_COOKIE_NAME,
        refreshCookieName: REFRESH_AUTH_COOKIE_NAME,
        maxAge: this.authTokenService.getAccessTokenTtl(),
        refreshMaxAge: this.authTokenService.getRefreshTokenTtl(),
      },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const payload =
      await this.authTokenService.verifyRefreshToken(refreshToken);
    const refreshSession = await this.authTokenService.getRefreshSession(
      payload.sessionId,
    );
    if (
      !refreshSession ||
      refreshSession.userId !== payload.id ||
      !isHashMatch(refreshSession.tokenHash, hashToken(refreshToken))
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const userResponse = await this.userService.findOne(payload.id);
    const user = userResponse.data;
    if (!user || user.status !== Status.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }

    await this.authTokenService.deleteRefreshSession(payload.sessionId);
    const tokens = await this.authTokenService.createAuthTokens(user);
    return {
      message: 'Token refreshed successfully',
      data: {
        user,
        ...tokens,
        cookieName: AUTH_COOKIE_NAME,
        refreshCookieName: REFRESH_AUTH_COOKIE_NAME,
        maxAge: this.authTokenService.getAccessTokenTtl(),
        refreshMaxAge: this.authTokenService.getRefreshTokenTtl(),
      },
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    try {
      const payload =
        await this.authTokenService.verifyRefreshToken(refreshToken);
      await this.authTokenService.deleteRefreshSession(payload.sessionId);
    } catch {
      return;
    }
  }

  authorizeExtension(user: AuthUser, request: AuthorizeExtensionDto) {
    return this.extensionAuthService.authorize(user, request);
  }

  exchangeExtensionCode(request: ExchangeExtensionCodeDto) {
    return this.extensionAuthService.exchangeCode(request);
  }

  refreshExtension(refreshToken: string) {
    return this.extensionAuthService.refresh(refreshToken);
  }

  logoutExtension(refreshToken: string) {
    return this.extensionAuthService.logout(refreshToken);
  }

  getAccessCookieOptions() {
    return this.authTokenService.getAccessCookieOptions();
  }

  getRefreshCookieOptions() {
    return this.authTokenService.getRefreshCookieOptions();
  }

  getCookieOptions() {
    return this.getAccessCookieOptions();
  }

  private async createAndSendCode(email: string, purpose: AuthCodePurpose) {
    const code = randomInt(100000, 1000000).toString();
    await this.cacheService.setValue(
      getAuthCodeKey(email),
      { codeHash: this.hashCode(email, code), purpose },
      AUTH_CODE_TTL_MS,
    );
    await this.mockMailService.sendAuthCode(email, code, purpose);
    return code;
  }

  private authCodeResponse(
    message: string,
    user: Parameters<typeof createAuthCodeResponse>[1],
    code: string,
  ) {
    return createAuthCodeResponse(
      message,
      user,
      code,
      this.configService.get<string>('nodeEnv') !== 'production',
    );
  }

  private isValidCode(email: string, code: string, authCode: StoredAuthCode) {
    return isHashMatch(authCode.codeHash, this.hashCode(email, code));
  }

  private hashCode(email: string, code: string) {
    return hashAuthCode(
      email,
      code,
      this.configService.get<string>('auth.accessTokenSecret'),
    );
  }
}
