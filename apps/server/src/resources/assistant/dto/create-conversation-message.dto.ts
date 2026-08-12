import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateConversationMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  content: string;
}
