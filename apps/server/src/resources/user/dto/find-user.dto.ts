import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from 'src/shared/dtos/pagination.dto';
import { Status } from 'src/shared/types';

export class FindUserDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: Status,
    example: Status.ACTIVE,
    description: 'User status to filter by',
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
