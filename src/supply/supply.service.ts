import { Injectable, NotFoundException } from '@nestjs/common';
import { GeminiProvider } from './gemini/gemini.provider';
import { RequestDto } from './dtos/request.dto';
import { UsersService } from 'src/users/users.service';
import { HumanDesignService } from 'src/human-design/human-design.service';
import { PromptsService } from 'src/prompts/prompts.service';
import {
  HumanDesignModuleType,
  Supply,
  validHumanDesignModules,
  validNumerologyModules,
} from './entities/supply.entity';
import { SupplyRepository } from './supply.repository';
import { Prompt } from 'src/prompts/entities/prompt.entity';
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

  async request(content: RequestDto) {
    await this.gemini.generateTopics(content.content);
  }

  async createModuleByUserIdAndPillar(
    id: string,
    pillar: string,
    module: string,
  ) {
    console.log(`[Service] Buscando por ${module} em ${pillar}`);
    const user = await this.users.findOne(id);
    console.log(`Maestra: ${user.fullName}`);
    const dnaData =
      pillar === 'human-design'
        ? await this.humanDesignService.findOneByUser(id)
        : await this.numerologyService.findOneByUser(id);
    console.log(`DNA: ${!!dnaData}`)
    const mainPrompt = await this.prompts.findByPillar('main');
    console.log(`Main Prompt: ${!!mainPrompt}`)
    const prompt = await this.prompts.findByPillarAndModule(pillar, module);
    console.log(`Module Prompt: ${!!prompt}`)
    const topics = await this.gemini.generateTopics(
      `${mainPrompt[0].prompt}\n${prompt.prompt}\n${dnaData.toPrompt()}\n${user.toUserDataPrompt()}`,
    );
    console.log(`Created Topic: ${!!topics}`)
    const supply = new Supply(pillar, module, user.id, topics);
    console.log(supply)
    return await this.supplyRepository.create(supply);
  }

  async createHumanDesignPillarByUserId(userId: string, pillar: string) {
    let createdModules: Supply[] = [];
    let modules;

    if (pillar === 'human-design') {
      modules = validHumanDesignModules;
    }
    if (pillar === 'numerology') {
      modules = validNumerologyModules;
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

  async checkSupplyByUserId(userId: string, pillar: string) {
    return await this.supplyRepository.checkSupplyByUserId(userId, pillar);
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
}
