import { Module } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant/ai-assistant.service';

@Module({
  providers: [AiAssistantService],
  exports: [AiAssistantService],
})
export class AiModule {}
