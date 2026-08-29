import type { WorkflowGraph, WorkflowGoal } from '@repo/contracts/workflow';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsDefined,
  IsArray,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class ActivationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1_000)
  description: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  examples: string[];
}

export class CreateDefinitionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  key: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ActivationDto)
  activation?: ActivationDto;

  @IsDefined()
  @IsObject()
  goal: WorkflowGoal;

  @IsObject()
  graph: WorkflowGraph;
}
