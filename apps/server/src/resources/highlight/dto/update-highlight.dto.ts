import { PartialType, PickType } from '@nestjs/swagger';
import { CreateHighlightDto } from './create-highlight.dto';

export class UpdateHighlightDto extends PartialType(
  PickType(CreateHighlightDto, ['note', 'color'] as const),
) {}
