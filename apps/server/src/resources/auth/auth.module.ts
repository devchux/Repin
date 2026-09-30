import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '../cache/cache.module';
import { UserModule } from '../user/user.module';
import { AuthService } from './services/auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { SelfOrSuperUserGuard } from './guards/self-or-super-user.guard';
import { SuperUserGuard } from './guards/super-user.guard';
import { AuthTokenService } from './services/auth-token.service';
import { ExtensionAuthService } from './services/extension-auth.service';
import { EmailModule } from '../email/email.module';
import { AuthEmailService } from './services/auth-email.service';

@Module({
  imports: [CacheModule, EmailModule, JwtModule.register({}), UserModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    ExtensionAuthService,
    AuthEmailService,
    AuthGuard,
    {
      provide: APP_GUARD,
      useExisting: AuthGuard,
    },
    SelfOrSuperUserGuard,
    SuperUserGuard,
  ],
  exports: [
    AuthService,
    AuthGuard,
    SelfOrSuperUserGuard,
    SuperUserGuard,
    JwtModule,
  ],
})
export class AuthModule {}
