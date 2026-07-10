import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  AUTH_COOKIE_NAME,
  REFRESH_AUTH_COOKIE_NAME,
} from 'src/config/constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import type { AuthenticatedRequest } from 'src/shared/types';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Public()
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('verify-code')
  @Public()
  async verifyCode(
    @Body() verifyCodeDto: VerifyCodeDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyCode(verifyCodeDto);
    response.cookie(
      AUTH_COOKIE_NAME,
      result.data.token,
      this.authService.getAccessCookieOptions(),
    );
    response.cookie(
      REFRESH_AUTH_COOKIE_NAME,
      result.data.refreshToken,
      this.authService.getRefreshCookieOptions(),
    );
    delete result.data.token;
    delete result.data.refreshToken;
    return result;
  }

  @Post('logout')
  @Public()
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(request.cookies?.[REFRESH_AUTH_COOKIE_NAME]);
    response.clearCookie(AUTH_COOKIE_NAME, {
      ...this.authService.getAccessCookieOptions(),
      maxAge: undefined,
    });
    response.clearCookie(REFRESH_AUTH_COOKIE_NAME, {
      ...this.authService.getRefreshCookieOptions(),
      maxAge: undefined,
    });
    return { message: 'Logged out successfully', data: null };
  }

  @Post('refresh')
  @Public()
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refresh(
      request.cookies?.[REFRESH_AUTH_COOKIE_NAME],
    );
    response.cookie(
      AUTH_COOKIE_NAME,
      result.data.token,
      this.authService.getAccessCookieOptions(),
    );
    response.cookie(
      REFRESH_AUTH_COOKIE_NAME,
      result.data.refreshToken,
      this.authService.getRefreshCookieOptions(),
    );
    delete result.data.token;
    delete result.data.refreshToken;
    return result;
  }

  @Get('me')
  me(@Req() request: Request) {
    return {
      message: 'Authenticated user found successfully',
      data: (request as AuthenticatedRequest).user,
    };
  }
}
