import {
  AI_ASSISTANT_CAPABILITIES,
  ASSISTANT_EXECUTION_LANES,
} from '@repo/contracts/assistant';
import type { AiAssistantCapability } from '@repo/contracts/assistant';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PageContextDto {
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  url: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  selectedText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  pageContent?: string;
}

export class OptionsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  targetLanguage?: string;
}

export class ExecuteDto {
  @IsIn(AI_ASSISTANT_CAPABILITIES)
  capability: AiAssistantCapability;

  @ValidateNested()
  @Type(() => PageContextDto)
  context: PageContextDto;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  input?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OptionsDto)
  options?: OptionsDto;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  browserSessionId?: string;

  @IsOptional()
  @IsIn(['extension', 'managed'])
  browserExecutionTarget?: 'extension' | 'managed';

  @IsOptional()
  @IsIn(ASSISTANT_EXECUTION_LANES)
  executionLane?: 'short' | 'long';
}
