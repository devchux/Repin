import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AUTH_COOKIE_NAME } from 'src/config/constants';
import { AccessTokenPayload, AuthenticatedRequest } from 'src/shared/types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const bearerToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : undefined;
    const cookieToken = request.cookies?.[AUTH_COOKIE_NAME];
    const token = bearerToken ?? cookieToken;

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: this.configService.get<string>('auth.accessTokenSecret'),
          ...(bearerToken
            ? { audience: 'repin-browser-extension', issuer: 'repin-server' }
            : {}),
        },
      );
      if (
        (bearerToken && payload.tokenUse !== 'extension_access') ||
        (cookieToken && !bearerToken && payload.tokenUse === 'extension_access')
      ) {
        throw new UnauthorizedException('Invalid authentication token type');
      }
      request.user = {
        id: payload.id,
        email: payload.email,
        isSuper: Boolean(payload.isSuper),
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication');
    }
  }
}
