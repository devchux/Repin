import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AssistantService } from './assistant.service';
import { ExecuteAssistantDto } from './dto/execute-assistant.dto';

@ApiTags('Assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('execute')
  execute(@Body() request: ExecuteAssistantDto) {
    return this.assistantService.execute(request);
  }
}
