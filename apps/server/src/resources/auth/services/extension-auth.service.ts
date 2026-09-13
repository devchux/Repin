import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'crypto';
import { CacheService } from '../../cache/cache.service';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/user.service';
import {
  AuthUser,
  ExtensionAuthorizationCode,
  ExtensionRefreshSession,
  Status,
} from 'src/shared/types';
import {
  getExtensionAuthorizationCodeKey,
  getExtensionRefreshTokenKey,
  hashToken,
  isHashMatch,
} from 'src/shared/utils/helper';
import { AuthorizeExtensionDto } from '../dto/authorize-extension.dto';
import { ExchangeExtensionCodeDto } from '../dto/exchange-extension-code.dto';
import {
  createPkceChallenge,
  isAllowedExtensionRedirectUri,
  toAuthUser,
} from '../utils/auth.utils';

@Injectable()
export class ExtensionAuthService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async authorize(user: AuthUser, request: AuthorizeExtensionDto) {
    this.assertRedirectUri(request.clientId, request.redirectUri);
    const code = randomBytes(32).toString('base64url');
    await this.cacheService.setValue(
      getExtensionAuthorizationCodeKey(code),
      {
        clientId: request.clientId,
        codeChallenge: request.codeChallenge,
        redirectUri: request.redirectUri,
        userId: user.id,
      } satisfies ExtensionAuthorizationCode,
      this.getAuthorizationCodeTtl(),
    );

    const redirectUrl = new URL(request.redirectUri);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', request.state);
    return {
      message: 'Extension connection approved',
      data: { redirectUrl: redirectUrl.toString() },
    };
  }

  async exchangeCode(request: ExchangeExtensionCodeDto) {
    this.assertRedirectUri(request.clientId, request.redirectUri);
    const key = getExtensionAuthorizationCodeKey(request.code);
    const authorizationCode =
      await this.cacheService.getValue<ExtensionAuthorizationCode>(key);

    if (!authorizationCode) {
      throw new UnauthorizedException('Invalid or expired authorization code');
    }

    await this.cacheService.deleteValue(key);
    const challenge = createPkceChallenge(request.codeVerifier);
    if (
      authorizationCode.clientId !== request.clientId ||
      authorizationCode.redirectUri !== request.redirectUri ||
      !isHashMatch(
        hashToken(authorizationCode.codeChallenge),
        hashToken(challenge),
      )
    ) {
      throw new UnauthorizedException('Authorization code validation failed');
    }

    const user = await this.findActiveUser(authorizationCode.userId);
    return this.createSession(user, request.clientId, request.installationId);
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const key = getExtensionRefreshTokenKey(refreshToken);
    const session =
      await this.cacheService.getValue<ExtensionRefreshSession>(key);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.cacheService.deleteValue(key);
    const user = await this.findActiveUser(session.userId);
    return this.issueTokens(user, session);
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      await this.cacheService.deleteValue(
        getExtensionRefreshTokenKey(refreshToken),
      );
    }
  }

  private createSession(user: User, clientId: string, installationId: string) {
    return this.issueTokens(user, {
      clientId,
      installationId,
      sessionId: randomUUID(),
      userId: user.id,
    });
  }

  private async issueTokens(user: User, session: ExtensionRefreshSession) {
    const accessToken = await this.jwtService.signAsync(
      {
        ...toAuthUser(user),
        sessionId: session.sessionId,
        tokenUse: 'extension_access',
      },
      {
        secret: this.configService.get<string>('auth.accessTokenSecret'),
        audience: 'repin-browser-extension',
        issuer: 'repin-server',
        expiresIn: Math.floor(this.getAccessTokenTtl() / 1000),
      },
    );
    const refreshToken = `repin_ext_${randomBytes(32).toString('base64url')}`;
    await this.cacheService.setValue(
      getExtensionRefreshTokenKey(refreshToken),
      session,
      this.getRefreshTokenTtl(),
    );

    return {
      message: 'Extension authenticated successfully',
      data: {
        accessToken,
        accessTokenExpiresIn: this.getAccessTokenTtl(),
        refreshToken,
        refreshTokenExpiresIn: this.getRefreshTokenTtl(),
        user: toAuthUser(user),
      },
    };
  }

  private assertRedirectUri(clientId: string, redirectUri: string) {
    const allowedClientIds =
      this.configService.get<string[]>('auth.extensionClientIds') ?? [];
    if (
      !isAllowedExtensionRedirectUri(clientId, redirectUri, allowedClientIds)
    ) {
      throw new BadRequestException('Invalid extension redirect URI');
    }
  }

  private async findActiveUser(userId: number) {
    const userResponse = await this.userService.findOne(userId);
    const user = userResponse.data;
    if (!user || user.status !== Status.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }
    return user;
  }

  private getAccessTokenTtl() {
    return this.configService.get<number>('auth.accessTokenTtl');
  }

  private getAuthorizationCodeTtl() {
    return this.configService.get<number>('auth.extensionAuthorizationCodeTtl');
  }

  private getRefreshTokenTtl() {
    return this.configService.get<number>('auth.extensionRefreshTokenTtl');
  }
}
