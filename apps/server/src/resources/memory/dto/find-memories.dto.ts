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
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class FindMemoriesDto {
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
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  query?: string;

  @IsOptional()
  @IsIn(MEMORY_SOURCE_TYPES)
  sourceType?: MemorySourceType;

  @IsOptional()
  @IsIn(['pending', 'processing', 'complete', 'failed'])
  embeddingStatus?: 'pending' | 'processing' | 'complete' | 'failed';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class FindMemoryContextDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  query?: string;

  @IsOptional()
  @IsIn(MEMORY_KINDS)
  kind?: MemoryKind;

  @IsOptional()
  @IsIn(MEMORY_SCOPES.filter((scope) => scope !== 'global'))
  scope?: Exclude<MemoryScope, 'global'>;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  scopeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit = 10;
}
