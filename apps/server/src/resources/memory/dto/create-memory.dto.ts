import {
  MEMORY_KINDS,
  MEMORY_SCOPES,
  MEMORY_SOURCE_TYPES,
  type MemoryKind,
  type MemoryScope,
  type MemorySourceType,
} from '@repo/contracts/memory';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateMemorySourceDto {
  @IsIn(MEMORY_SOURCE_TYPES)
  type: MemorySourceType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  sourceId?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2_000)
  url?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  observedAt?: Date;
}

export class CreateMemoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4_000)
  content: string;

  @IsOptional()
  @IsIn(MEMORY_KINDS)
  kind?: MemoryKind;

  @IsOptional()
  @IsIn(MEMORY_SCOPES)
  scope?: MemoryScope;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  scopeId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMemorySourceDto)
  source?: CreateMemorySourceDto;
}
