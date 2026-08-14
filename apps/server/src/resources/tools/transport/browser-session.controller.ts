import { Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { AuthUser, Configuration } from 'src/shared/types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

class CreateBrowserSessionTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  browserSessionId: string;
}

@Controller('browser-sessions')
export class BrowserSessionController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Configuration>,
  ) {}

  @Post('ticket')
  async createTicket(
    @CurrentUser() user: AuthUser,
    @Body() request: CreateBrowserSessionTicketDto,
  ) {
    const ticket = await this.jwtService.signAsync(
      { sub: user.id, browserSessionId: request.browserSessionId },
      {
        secret: this.config.get('auth.accessTokenSecret', { infer: true }),
        audience: 'repin-browser-extension',
        issuer: 'repin-server',
        expiresIn: '60s',
      },
    );
    return { message: 'Browser session ticket created', data: { ticket } };
  }
}
