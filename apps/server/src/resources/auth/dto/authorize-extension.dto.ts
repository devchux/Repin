import {
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class AuthorizeExtensionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  clientId: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43,128}$/)
  codeChallenge: string;

  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(500)
  redirectUri: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{16,256}$/)
  state: string;
}
