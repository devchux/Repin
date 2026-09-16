import { PartialType, PickType } from '@nestjs/swagger';
import { CreateBookmarkDto } from './create-bookmark.dto';

export class UpdateBookmarkDto extends PartialType(
  PickType(CreateBookmarkDto, [
    'title',
    'description',
    'siteName',
    'author',
    'publishedAt',
    'imageUrl',
    'faviconUrl',
    'excerpt',
    'content',
    'selectedText',
    'note',
    'saveReason',
    'tags',
  ] as const),
) {}
