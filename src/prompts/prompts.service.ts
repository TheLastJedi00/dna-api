import { Injectable, NotFoundException } from '@nestjs/common';
import { PromptsRepository } from './prompts.repository';
import { Prompt } from './entities/prompt.entity';
import { CacheService } from '../redis/cache.service';

const PROMPT_TTL = 30 * 60; // 30min

@Injectable()
export class PromptsService {
  constructor(
    private readonly repository: PromptsRepository,
    private readonly cache: CacheService,
  ) {}

  async findByPillar(pillar: string) {
    return this.cache.getOrSet(`prompt:pillar:${pillar}`, PROMPT_TTL, async () => {
      const prompt = await this.repository.findPromptByPillar(pillar);
      if (!prompt) {
        throw new NotFoundException(`Prompt for "${pillar}" Pillar not found.`);
      }
      return prompt;
    });
  }

  async findByPillarAndModule(pillar: string, module: string) {
    const resolvedModule = module.includes('portao') ? 'portoes' : module;
    return this.cache.getOrSet(
      `prompt:module:${pillar}:${resolvedModule}`,
      PROMPT_TTL,
      async () => {
        const prompt = await this.repository.findByPillarAndModule(
          pillar,
          resolvedModule,
        );
        if (!prompt) {
          throw new NotFoundException(
            `Prompt for "${pillar}" Pillar and ${module} Module not found.`,
          );
        }
        return prompt;
      },
    );
  }

  async createPrompt(prompt: Prompt) {
    return this.repository.createPrompt(prompt);
  }

  async createManyPrompts(prompts: Prompt[]) {
    // Prompts têm TTL curto no cache; novas versões aparecem após expirar.
    return this.repository.createManyPrompts(prompts);
  }
}
