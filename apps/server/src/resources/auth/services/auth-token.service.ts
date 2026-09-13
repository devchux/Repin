import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { CacheService } from '../../cache/cache.service';
import { User } from '../../user/entities/user.entity';
import { RefreshSession, RefreshTokenPayload } from 'src/shared/types';
import { getRefreshTokenKey, hashToken } from 'src/shared/utils/helper';
import { toAuthUser } from '../utils/auth.utils';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async createAuthTokens(user: User) {
    const [token, refreshToken] = await Promise.all([
      this.createAccessToken(user),
      this.createRefreshToken(user),
    ]);

    return { token, refreshToken };
  }

  async verifyRefreshToken(refreshToken: string) {
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

  getRefreshSession(sessionId: string) {
    return this.cacheService.getValue<RefreshSession>(
      getRefreshTokenKey(sessionId),
    );
  }

  deleteRefreshSession(sessionId: string) {
    return this.cacheService.deleteValue(getRefreshTokenKey(sessionId));
  }

  getAccessCookieOptions() {
    return this.getCookieOptions(this.getAccessTokenTtl());
  }

  getRefreshCookieOptions() {
    return this.getCookieOptions(this.getRefreshTokenTtl());
  }

  getAccessTokenTtl() {
    return this.configService.get<number>('auth.accessTokenTtl');
  }

  getRefreshTokenTtl() {
    return this.configService.get<number>('auth.refreshTokenTtl');
  }

  private createAccessToken(user: User) {
    return this.jwtService.signAsync(toAuthUser(user), {
      secret: this.configService.get<string>('auth.accessTokenSecret'),
      expiresIn: Math.floor(this.getAccessTokenTtl() / 1000),
    });
  }

  private async createRefreshToken(user: User) {
    const sessionId = randomUUID();
    const payload: RefreshTokenPayload = {
      ...toAuthUser(user),
      sessionId,
    };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('auth.refreshTokenSecret'),
      expiresIn: Math.floor(this.getRefreshTokenTtl() / 1000),
    });

    await this.cacheService.setValue(
      getRefreshTokenKey(sessionId),
      { userId: user.id, tokenHash: hashToken(token) },
      this.getRefreshTokenTtl(),
    );
    return token;
  }

  private getCookieOptions(maxAge: number) {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.configService.get<string>('nodeEnv') === 'production',
      maxAge,
      path: '/',
    };
  }
}
