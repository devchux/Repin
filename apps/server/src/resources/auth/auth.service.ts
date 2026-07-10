import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomInt, randomUUID } from 'crypto';
import {
  RefreshSession,
  RefreshTokenPayload,
  Status,
  StoredAuthCode,
} from 'src/shared/types';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import {
  AUTH_COOKIE_NAME,
  REFRESH_AUTH_COOKIE_NAME,
} from 'src/config/constants';
import { MockMailService } from './mock-mail.service';
import { AuthCodePurpose, AuthUser } from 'src/shared/types';
import { CacheService } from '../cache/cache.service';
import {
  getAuthCodeKey,
  getRefreshTokenKey,
  hashAuthCode,
  hashToken,
  isHashMatch,
  normalizeEmail,
} from 'src/shared/utils/helper';

@Injectable()
export class AuthService {
  private readonly authCodeTtlMs = 10 * 60 * 1000;

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
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

    const tokens = await this.createAuthTokens(activeUser);

    return {
      message: 'Code verified successfully',
      data: {
        user: activeUser,
        ...tokens,
        cookieName: AUTH_COOKIE_NAME,
        refreshCookieName: REFRESH_AUTH_COOKIE_NAME,
        maxAge: this.getAccessTokenTtl(),
        refreshMaxAge: this.getRefreshTokenTtl(),
      },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const payload = await this.verifyRefreshToken(refreshToken);
    const refreshSession = await this.cacheService.getValue<RefreshSession>(
      getRefreshTokenKey(payload.sessionId),
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

    await this.cacheService.deleteValue(getRefreshTokenKey(payload.sessionId));
    const tokens = await this.createAuthTokens(user);

    return {
      message: 'Token refreshed successfully',
      data: {
        user,
        ...tokens,
        cookieName: AUTH_COOKIE_NAME,
        refreshCookieName: REFRESH_AUTH_COOKIE_NAME,
        maxAge: this.getAccessTokenTtl(),
        refreshMaxAge: this.getRefreshTokenTtl(),
      },
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.cacheService.deleteValue(
        getRefreshTokenKey(payload.sessionId),
      );
    } catch {
      return;
    }
  }

  getAccessCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.configService.get<string>('nodeEnv') === 'production',
      maxAge: this.getAccessTokenTtl(),
      path: '/',
    };
  }

  getRefreshCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.configService.get<string>('nodeEnv') === 'production',
      maxAge: this.getRefreshTokenTtl(),
      path: '/',
    };
  }

  getCookieOptions() {
    return this.getAccessCookieOptions();
  }

  private async createAndSendCode(email: string, purpose: AuthCodePurpose) {
    const code = randomInt(100000, 1000000).toString();
    await this.cacheService.setValue(
      getAuthCodeKey(email),
      {
        codeHash: this.hashCode(email, code),
        purpose,
      },
      this.authCodeTtlMs,
    );
    await this.mockMailService.sendAuthCode(email, code, purpose);
    return code;
  }

  private async createAccessToken(user: User) {
    const payload: AuthUser = {
      id: user.id,
      email: user.email,
      isSuper: Boolean(user.isSuper),
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('auth.accessTokenSecret'),
      expiresIn: Math.floor(this.getAccessTokenTtl() / 1000),
    });
  }

  private async createRefreshToken(user: User) {
    const sessionId = randomUUID();
    const payload: RefreshTokenPayload = {
      id: user.id,
      email: user.email,
      isSuper: Boolean(user.isSuper),
      sessionId,
    };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('auth.refreshTokenSecret'),
      expiresIn: Math.floor(this.getRefreshTokenTtl() / 1000),
    });
    await this.cacheService.setValue(
      getRefreshTokenKey(sessionId),
      {
        userId: user.id,
        tokenHash: hashToken(token),
      },
      this.getRefreshTokenTtl(),
    );
    return token;
  }

  private async createAuthTokens(user: User) {
    const [token, refreshToken] = await Promise.all([
      this.createAccessToken(user),
      this.createRefreshToken(user),
    ]);

    return { token, refreshToken };
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('auth.refreshTokenSecret'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private authCodeResponse(message: string, user: User, code: string) {
    const data: Record<string, unknown> = {
      user,
      expiresIn: this.authCodeTtlMs,
    };

    if (this.configService.get<string>('nodeEnv') !== 'production') {
      data.mockCode = code;
    }

    return { message, data };
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

  private getAccessTokenTtl() {
    return this.configService.get<number>('auth.accessTokenTtl');
  }

  private getRefreshTokenTtl() {
    return this.configService.get<number>('auth.refreshTokenTtl');
  }
}
