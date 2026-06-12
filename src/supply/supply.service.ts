import { Injectable, NotFoundException } from '@nestjs/common';
import { GeminiProvider } from './gemini/gemini.provider';
import { RequestDto } from './dtos/request.dto';
import { UsersService } from 'src/users/users.service';
import { HumanDesignService } from 'src/human-design/human-design.service';
import { PromptsService } from 'src/prompts/prompts.service';
import {
  HumanDesignModuleType,
  Supply,
  validAstrologyModules,
  validHumanDesignModules,
  validNumerologyModules,
} from './entities/supply.entity';
import { SupplyRepository } from './supply.repository';
import { NumerologyService } from 'src/numerology/numerology.service';

@Injectable()
export class SupplyService {
  constructor(
    private readonly gemini: GeminiProvider,
    private readonly humanDesignService: HumanDesignService,
    private readonly numerologyService: NumerologyService,
    private readonly users: UsersService,
    private readonly prompts: PromptsService,
    private readonly supplyRepository: SupplyRepository,
  ) {}

  supplyIdGenerator(userId: string, pillar: string, module: string) {
    return `${userId}-${pillar}-${module}`;
  }

  async request(content: RequestDto) {
    await this.gemini.generateTopics(content.content);
  }

  async createModuleByUserIdAndPillar(
    id: string,
    pillar: string,
    module: string,
  ) {
    const existingSupply = await this.supplyRepository.findById(
      this.supplyIdGenerator(id, pillar, module),
    );
    if (existingSupply) {
      console.log(`Módulo ${module} já existe pra essse usuário.`);
      return existingSupply;
    }
    const user = await this.users.findOne(id);
    const dnaData =
      pillar === 'human-design'
        ? await this.humanDesignService.findOneByUser(id)
        : await this.numerologyService.findOneByUser(id);
    const mainPrompt = await this.prompts.findByPillar('main');
    const prompt = await this.prompts.findByPillarAndModule(pillar, module);
    const topics = await this.gemini.generateTopics(
      `${mainPrompt[0].prompt}\n${prompt.prompt}\n${dnaData.toPrompt()}\n${user.toUserDataPrompt()}`,
    );
    const supply = new Supply(pillar, module, user.id, topics);
    return await this.supplyRepository.create(supply);
  }

  async createFullPillarByUserId(userId: string, pillar: string) {
    let createdModules: Supply[] = [];
    let modules;
    switch (pillar) {
      case 'human-design':
        modules = validHumanDesignModules;
        break;
      case 'numerology':
        modules = validNumerologyModules;
        break;
      case 'astrology':
        modules = validAstrologyModules;
        break;
    }

    for (const m of modules) {
      const module = await this.createModuleByUserIdAndPillar(
        userId,
        pillar,
        m,
      );
      createdModules.push(module);
    }
    return createdModules;
  }

  async checkSupplyByUserIdAndPillar(userId: string, pillar: string) {
    const supplies = await this.supplyRepository.findByUserAndPillar(
      userId,
      pillar,
    );
    if (!supplies) {
      return false;
    }
    const validModulesMap: Record<string, string[]> = {
      'human-design': validHumanDesignModules,
      'numerology': validNumerologyModules,
      'astrology': validAstrologyModules,
    };
    const expectedModules = validModulesMap[pillar];
    return expectedModules.every((e) => supplies.some((s) => s.module === e))
  }

  async findHumanDesignModuleByUserId(
    userId: string,
    module: HumanDesignModuleType,
  ) {
    const supply = await this.supplyRepository.findById(
      `${userId}-human-design-${module}`,
    );
    if (!supply) {
      throw new NotFoundException(
        'Nenhum material encontrado com essa informações',
      );
    }
    return supply;
  }

  async findNumerologyModuleByUserId(userId: string, module: string) {
    const supply = await this.supplyRepository.findById(
      `${userId}-numerology-${module}`,
    );
    if (!supply) {
      throw new NotFoundException(
        'Nenhum material encontrado com essas informações',
      );
    }
    return supply;
  }
}
