import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

const HTTP_URL_OPTIONS = {
  protocols: ['http', 'https'],
  require_protocol: true,
};

export class CreateBookmarkDto {
  @ApiProperty({ example: 'https://example.com/articles/browser-agents' })
  @IsUrl(HTTP_URL_OPTIONS)
  @MaxLength(4096)
  url: string;

  @ApiPropertyOptional({
    example: 'https://example.com/articles/browser-agents',
  })
  @IsOptional()
  @IsUrl(HTTP_URL_OPTIONS)
  @MaxLength(4096)
  canonicalUrl?: string;

  @ApiProperty({ example: 'How browser agents work' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  siteName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  author?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(HTTP_URL_OPTIONS)
  @MaxLength(4096)
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(HTTP_URL_OPTIONS)
  @MaxLength(4096)
  faviconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  excerpt?: string;

  @ApiPropertyOptional({
    description: 'Readable page text captured by the client',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1_000_000)
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  selectedText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  note?: string;

  @ApiPropertyOptional({ description: 'Why the user saved this page' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  saveReason?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 25 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'When the client captured the page' })
  @IsOptional()
  @IsDateString()
  capturedAt?: string;
}
