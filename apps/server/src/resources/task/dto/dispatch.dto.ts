import { IsIn, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import type { TaskSelectionMode } from '@repo/contracts/task';
import { ExecuteDto } from '../../assistant/dto/execute.dto';

export class DispatchDto extends ExecuteDto {
  @IsOptional()
  @IsIn(['auto', 'assistant', 'workflow'])
  selectionMode?: TaskSelectionMode;

  @ValidateIf((request: DispatchDto) => request.selectionMode === 'workflow')
  @IsUUID()
  workflowDefinitionId?: string;
}
