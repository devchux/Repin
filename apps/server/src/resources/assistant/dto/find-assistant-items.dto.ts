import {
  AI_ASSISTANT_CAPABILITIES,
  ASSISTANT_RUN_STATUSES,
} from '@repo/contracts/assistant';
import type {
  AiAssistantCapability,
  AssistantRunStatus,
} from '@repo/contracts/assistant';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

class AssistantPageDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class FindRunsDto extends AssistantPageDto {
  @ApiPropertyOptional({ enum: ASSISTANT_RUN_STATUSES })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value : typeof value === 'string' ? [value] : value,
  )
  @IsArray()
  @IsIn(ASSISTANT_RUN_STATUSES, { each: true })
  status?: AssistantRunStatus[];
}

export class FindConversationsDto extends AssistantPageDto {
  @ApiPropertyOptional({ enum: AI_ASSISTANT_CAPABILITIES })
  @IsOptional()
  @IsIn(AI_ASSISTANT_CAPABILITIES)
  capability?: AiAssistantCapability;

  @ApiPropertyOptional({
    description: 'Only return conversations updated after this ISO timestamp',
  })
  @IsOptional()
  @IsISO8601()
  updatedAfter?: string;

  @ApiPropertyOptional({
    enum: ['recent', 'created', 'oldest', 'messages'],
    default: 'recent',
  })
  @IsOptional()
  @IsIn(['recent', 'created', 'oldest', 'messages'])
  sort: 'recent' | 'created' | 'oldest' | 'messages' = 'recent';
}
