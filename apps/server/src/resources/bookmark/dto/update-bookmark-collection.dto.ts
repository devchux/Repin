import { PartialType } from '@nestjs/swagger';
import { CreateBookmarkCollectionDto } from './create-bookmark-collection.dto';

export class UpdateBookmarkCollectionDto extends PartialType(
  CreateBookmarkCollectionDto,
) {}
