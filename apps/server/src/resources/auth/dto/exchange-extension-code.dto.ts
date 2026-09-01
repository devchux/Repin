import {
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class ExchangeExtensionCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  clientId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  code: string;

  @IsString()
  @Matches(/^[A-Za-z0-9._~-]{43,128}$/)
  codeVerifier: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  installationId: string;

  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(500)
  redirectUri: string;
}
