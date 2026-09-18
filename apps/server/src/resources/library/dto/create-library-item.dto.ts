import {
  LIBRARY_ITEM_TYPES,
  type LibraryItemType,
} from '@repo/contracts/library';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateLibraryItemDto {
  @IsIn(LIBRARY_ITEM_TYPES)
  type: LibraryItemType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000)
  content?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2_000)
  url?: string;
}
