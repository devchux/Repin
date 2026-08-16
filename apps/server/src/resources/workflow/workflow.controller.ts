import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from 'src/shared/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateDefinitionDto } from './dto/create-definition.dto';
import { StartDto } from './dto/start.dto';
import { WorkflowService } from './services/workflow.service';

@ApiTags('Workflows')
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflows: WorkflowService) {}

  @Post('definitions')
  createDefinition(
    @CurrentUser() user: AuthUser,
    @Body() request: CreateDefinitionDto,
  ) {
    return this.workflows.createDefinition(user.id, request);
  }

  @Get('definitions/:id')
  findDefinition(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflows.findDefinition(user.id, id);
  }

  @Post('definitions/:id/instances')
  start(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: StartDto,
  ) {
    return this.workflows.start(user.id, id, request);
  }

  @Get('instances/:id')
  findInstance(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflows.findInstance(user.id, id);
  }

  @Post('instances/:id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflows.cancel(user.id, id);
  }
}
