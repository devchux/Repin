import { IsObject, IsOptional } from 'class-validator';

export class StartDto {
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}
