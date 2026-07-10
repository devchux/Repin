import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'John',
    description: 'First name of the user',
    required: true,
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the user',
    required: true,
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email of the user',
    required: true,
  })
  @IsString()
  @IsEmail({ blacklisted_chars: '+' }, { message: 'Email is not valid' })
  email: string;
}
