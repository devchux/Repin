import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email of the user',
    required: true,
  })
  @IsString()
  @IsEmail({ blacklisted_chars: '+' }, { message: 'Email is not valid' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'One-time verification code',
    required: true,
  })
  @IsString()
  @Length(6, 6)
  code: string;
}
