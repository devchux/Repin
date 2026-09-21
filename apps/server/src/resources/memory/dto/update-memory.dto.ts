import { PartialType, PickType } from '@nestjs/swagger';
import { CreateMemoryDto } from './create-memory.dto';

export class UpdateMemoryDto extends PartialType(
  PickType(CreateMemoryDto, ['content', 'scope', 'scopeId'] as const),
) {}
