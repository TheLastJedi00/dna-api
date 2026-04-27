import { Injectable, NotFoundException } from '@nestjs/common';
import { PromptsRepository } from './prompts.repository';
import { Prompt } from './entities/prompt.entity';

@Injectable()
export class PromptsService {
  constructor(private readonly repository: PromptsRepository) {}

  async findByPillar(pillar: string) {
    const prompt = await this.repository.findPromptByPillar(pillar);
    if (!prompt) {
      throw new NotFoundException(`Prompt for "${pillar}" Pillar not found.`);
    }
    return prompt;
  }

  async findByPillarAndModule(pillar: string, module: string) {
    let prompt: Prompt | null;
    if (module.includes('portoes')) {
      prompt = await this.repository.findByPillarAndModule(pillar, 'portoes');
    } else {
      prompt = await this.repository.findByPillarAndModule(pillar, module);
    }
    if (!prompt) {
      throw new NotFoundException(
        `Prompt for "${pillar}" Pillar and ${module} Module not found.`,
      );
    }
    return prompt;
  }

  async createPrompt(prompt: Prompt) {
    return this.repository.createPrompt(prompt);
  }
}
