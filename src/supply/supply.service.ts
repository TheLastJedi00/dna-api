import { Injectable, NotFoundException } from '@nestjs/common';
import { GeminiProvider } from './gemini/gemini.provider';
import { RequestDto } from './dtos/request.dto';
import { UsersService } from 'src/users/users.service';
import { HumanDesignService } from 'src/human-design/human-design.service';
import { AstrologyService } from 'src/astrology/astrology.service';
import { PromptsService } from 'src/prompts/prompts.service';
import {
  AstrologyModuleType,
  HumanDesignModuleType,
  Supply,
  validAstrologyModules,
  validHumanDesignModules,
  validNumerologyModules,
} from './entities/supply.entity';
import { SupplyRepository } from './supply.repository';
import { Prompt } from 'src/prompts/entities/prompt.entity';
import { NumerologyService } from 'src/numerology/numerology.service';
import { Astrology } from 'src/astrology/entities/astrology.entity';
import { Numerology } from 'src/numerology/entities/numerology.entity';
import { HumanDesign } from 'src/human-design/entities/human-design.model';

@Injectable()
export class SupplyService {
  constructor(
    private readonly gemini: GeminiProvider,
    private readonly humanDesignService: HumanDesignService,
    private readonly numerologyService: NumerologyService,
    private readonly astrologyService: AstrologyService,
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
    switch (pillar) {
      case 'human-design':
        return await this.createHumanDesignModule(id, module);
      case 'numerology':
        return await this.createNumerologyModule(id, module);
      case 'astrology':
        return await this.createAstrologyModule(id, module);
      case 'perfect-plain':
        return await this.createPerfectPlainModule(id);
      default:
        throw new NotFoundException(`Pillar inválido: ${pillar}`);
    }
  }

  private async createHumanDesignModule(userId: string, module: string) {
    const dnaData = await this.humanDesignService.findOneByUser(userId);
    return await this.generateModuleSupply(
      userId,
      'human-design',
      module,
      dnaData.toPrompt(),
    );
  }

  private async createNumerologyModule(userId: string, module: string) {
    const dnaData = await this.numerologyService.findOneByUser(userId);
    return await this.generateModuleSupply(
      userId,
      'numerology',
      module,
      dnaData.toPrompt(),
    );
  }

  private async createAstrologyModule(userId: string, module: string) {
    const dnaData = await this.astrologyService.findOneByUser(userId);
    return await this.generateModuleSupply(
      userId,
      'astrology',
      module,
      dnaData.toPrompt(),
    );
  }

  private async createPerfectPlainModule(userId: string){
    const hdData = await this.humanDesignService.findOneByUser(userId);
    const numData = await this.numerologyService.findOneByUser(userId);
    const astroData = await this.astrologyService.findOneByUser(userId);
    const dnaPrompt = `Desenho humano: ${hdData}\nNumerologia: ${numData}\nAstrologia: ${astroData}`
    return await this.generateModuleSupply(
      userId,
      'perfect-plain',
      'perfect-plain',
      dnaPrompt,
    );
  }

  private async generateModuleSupply(
    userId: string,
    pillar: string,
    module: string,
    dnaData: string,
  ) {
    const user = await this.users.findOne(userId);
    const mainPrompt = await this.prompts.findByPillar('main');
    const prompt = await this.prompts.findByPillarAndModule(pillar, module);
    const topics = await this.gemini.generateTopics(
      `${mainPrompt[0].prompt}\n${prompt.prompt}\n${dnaData}\n${user.toUserDataPrompt()}`,
    );
    const supply = new Supply(pillar, module, user.id, topics);
    console.log(supply);
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
      case 'perfect-plain':
        modules = ['perfect-plain'];
        break;
      default:
        throw new NotFoundException(`Pillar inválido: ${pillar}`);
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

  async findAstrologyModuleByUserId(
    userId: string,
    module: AstrologyModuleType,
  ) {
    const supply = await this.supplyRepository.findById(
      `${userId}-astrology-${module}`,
    );
    if (!supply) {
      throw new NotFoundException(
        'Nenhum material encontrado com essas informações',
      );
    }
    return supply;
  }

  async findPerfectPlainByUserId(userId: string) {
    const supply = await this.supplyRepository.findById(
      `${userId}-perfect-plain`,
    );
    if (!supply) {
      throw new NotFoundException(
        'Nenhum material encontrado com essas informações',
      );
    }
    return supply;
  }
}
