import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { trimStringValue } from 'src/shared/utils/helper';

export class CreateUserDto {
  @ApiProperty({
    example: 'John',
    description: 'First name of the user',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimStringValue)
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the user',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimStringValue)
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
