import { ApiPropertyOptional } from '@nestjs/swagger';
import { LIBRARY_ITEM_TYPES } from '@repo/contracts/library';
import type { LibraryItemType } from '@repo/contracts/library';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class FindLibraryItemsDto {
  @ApiPropertyOptional({ enum: LIBRARY_ITEM_TYPES })
  @IsOptional()
  @IsIn(LIBRARY_ITEM_TYPES)
  type?: LibraryItemType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
