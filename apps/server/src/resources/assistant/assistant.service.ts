import { BadRequestException, Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { createAssistantMessages } from './assistant.prompts';
import { ExecuteAssistantDto } from './dto/execute-assistant.dto';

@Injectable()
export class AssistantService {
  constructor(private readonly aiService: AiService) {}

  async execute(request: ExecuteAssistantDto) {
    this.validateRequest(request);

    const result = await this.aiService.generate({
      messages: createAssistantMessages(request),
    });

    return {
      message: 'Assistant request completed successfully',
      data: {
        capability: request.capability,
        content: result.content,
        usage: result.usage,
      },
    };
  }

  private validateRequest(request: ExecuteAssistantDto): void {
    if (!request.context.selectedText && !request.context.pageContent) {
      throw new BadRequestException(
        'Selected text or page content is required',
      );
    }

    if (
      request.capability === 'translate' &&
      !request.options?.targetLanguage
    ) {
      throw new BadRequestException(
        'Target language is required for translation',
      );
    }
  }
}
