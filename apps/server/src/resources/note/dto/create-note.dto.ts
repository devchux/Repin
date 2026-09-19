import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { trimStringValue } from 'src/shared/utils/helper';

export class CreateNoteDto {
  @ApiProperty()
  @Transform(trimStringValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty()
  @Transform(trimStringValue)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(4096)
  sourceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  selectedText?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 25 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
