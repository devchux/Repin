import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '../cache/cache.module';
import { UserModule } from '../user/user.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MockMailService } from './mock-mail.service';
import { AuthGuard } from './guards/auth.guard';
import { SelfOrSuperUserGuard } from './guards/self-or-super-user.guard';
import { SuperUserGuard } from './guards/super-user.guard';

@Module({
  imports: [CacheModule, JwtModule.register({}), UserModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    MockMailService,
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
