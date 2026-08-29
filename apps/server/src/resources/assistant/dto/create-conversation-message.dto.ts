import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ASSISTANT_EXECUTION_LANES } from '@repo/contracts/assistant';

export class CreateConversationMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  content: string;

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
