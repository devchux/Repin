import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  Matches,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { HIGHLIGHT_COLORS } from '../entities/highlight.entity';
import type { HighlightColor } from '../entities/highlight.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateHighlightDto {
  @ApiPropertyOptional({ description: 'Stable UUID for retry-safe creation' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({ example: 'https://example.com/article' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(4096)
  url: string;

  @ApiProperty({ example: 'An article worth reading' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  pageTitle: string;

  @ApiProperty({ description: 'Exact selected text' })
  @IsString()
  @Matches(/\S/u)
  @MaxLength(50_000)
  quote: string;

  @ApiPropertyOptional({ description: 'Text immediately before the quote' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  prefix?: string;

  @ApiPropertyOptional({ description: 'Text immediately after the quote' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  suffix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  note?: string | null;

  @ApiPropertyOptional({ enum: HIGHLIGHT_COLORS, default: 'yellow' })
  @IsOptional()
  @IsIn(HIGHLIGHT_COLORS)
  color?: HighlightColor | null;

  @ApiPropertyOptional({
    description: 'When the client captured the selection',
  })
  @IsOptional()
  @IsDateString()
  capturedAt?: string;
}
