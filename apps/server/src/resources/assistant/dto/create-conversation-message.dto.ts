import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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
}
