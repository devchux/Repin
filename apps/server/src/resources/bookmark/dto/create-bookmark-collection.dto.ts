import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { trimStringValue } from 'src/shared/utils/helper';

export class CreateBookmarkCollectionDto {
  @ApiProperty()
  @Transform(trimStringValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @Transform(trimStringValue)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '#7c3aed' })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
