import {
  MEMORY_KINDS,
  MEMORY_SCOPES,
  type MemoryKind,
  type MemoryScope,
} from '@repo/contracts/memory';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMemoryFromSourceDto {
  @IsUUID()
  sourceId: string;

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
}
