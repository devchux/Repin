import { PartialType, PickType } from '@nestjs/swagger';
import { CreateNoteDto } from './create-note.dto';

export class UpdateNoteDto extends PartialType(
  PickType(CreateNoteDto, ['title', 'body', 'tags'] as const),
) {}
