import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RefreshExtensionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  refreshToken: string;
}
