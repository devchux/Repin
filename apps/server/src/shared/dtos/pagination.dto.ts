import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({
    type: 'string',
    example: 'john',
    description: 'Search term used to filter matching records',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    type: 'number',
    example: 1,
    description: 'Page number to return when pagination is enabled',
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    type: 'number',
    example: 10,
    description: 'Number of records to return per page',
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Field name used to sort returned records in ascending order',
  })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiPropertyOptional({
    type: 'string',
    enum: ['true', 'false'],
    example: 'true',
    description: 'Whether the response should be paginated',
  })
  @IsOptional()
  @IsEnum(['true', 'false'])
  paginated?: 'true' | 'false';
}
