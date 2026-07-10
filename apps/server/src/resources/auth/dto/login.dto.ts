import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email of the user',
    required: true,
  })
  @IsString()
  @IsEmail({ blacklisted_chars: '+' }, { message: 'Email is not valid' })
  email: string;
}
