import {
  AI_ASSISTANT_CAPABILITIES,
  ASSISTANT_EXECUTION_LANES,
} from '@repo/contracts/assistant';
import type { AiAssistantCapability } from '@repo/contracts/assistant';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PAGE_CONTENT_BLOCK_KINDS } from '@repo/contracts/context';

export class PageContentBlockDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  id: string;

  @IsIn(PAGE_CONTENT_BLOCK_KINDS)
  kind: (typeof PAGE_CONTENT_BLOCK_KINDS)[number];

  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  text: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  headingPath?: readonly string[];

  @IsBoolean()
  visible: boolean;

  @IsBoolean()
  inViewport: boolean;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  sourceFrameUrl?: string;
}

export class PageObservationDto {
  @IsInt()
  @IsIn([1])
  schemaVersion: 1;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  observationId: string;

  @IsString()
  @MaxLength(200)
  tabId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  documentRevision: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  capturedAt: string;

  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  url: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PageContentBlockDto)
  blocks: readonly PageContentBlockDto[];

  @IsBoolean()
  truncated: boolean;
}

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

  @IsOptional()
  @ValidateNested()
  @Type(() => PageObservationDto)
  observation?: PageObservationDto;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  observationId?: string;
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
