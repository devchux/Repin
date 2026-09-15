import { PartialType, PickType } from '@nestjs/swagger';
import { CreateSavedPageDto } from './create-saved-page.dto';

export class UpdateSavedPageDto extends PartialType(
  PickType(CreateSavedPageDto, [
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
    'tags',
  ] as const),
) {}
