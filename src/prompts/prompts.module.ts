import { Module } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { PromptsRepository } from './prompts.repository';

@Module({
  providers: [PromptsService, PromptsRepository],
  exports: [PromptsService]
})
export class PromptsModule {}
