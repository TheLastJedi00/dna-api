import { Module } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { PromptsRepository } from './prompts.repository';
import { PromptsController } from './prompts.controller';

@Module({
  providers: [PromptsService, PromptsRepository],
  exports: [PromptsService],
  controllers: [PromptsController]
})
export class PromptsModule {}
