import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class RequestEmailChangeDto {
  @ApiProperty({ example: 'new-email@example.com' })
  @IsString()
  @IsEmail({ blacklisted_chars: '+' }, { message: 'Email is not valid' })
  email: string;
}
