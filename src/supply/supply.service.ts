import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GeminiProvider } from './gemini/gemini.provider';
import { UsersService } from 'src/users/users.service';
import { HumanDesignService } from 'src/human-design/human-design.service';
import { PromptsService } from 'src/prompts/prompts.service';
import {
  HumanDesignModuleType,
  Supply,
  validAstrologyModules,
  validHumanDesignModules,
  validNumerologyModules,
  validPerfectPlainModules,
} from './entities/supply.entity';
import { SupplyRepository } from './supply.repository';
import { NumerologyService } from 'src/numerology/numerology.service';
import { AstrologyService } from 'src/astrology/astrology.service';
import { CacheService } from 'src/redis/cache.service';

const SUPPLY_CACHE_TTL = 60 * 60; // 1h

@Injectable()
export class SupplyService {
  constructor(
    private readonly gemini: GeminiProvider,
    private readonly humanDesignService: HumanDesignService,
    private readonly numerologyService: NumerologyService,
    private readonly users: UsersService,
    private readonly prompts: PromptsService,
    private readonly supplyRepository: SupplyRepository,
    private readonly astrologyService: AstrologyService,
    private readonly cache: CacheService,
  ) {}

  private supplyCacheKey(pillar: string, module: string, userId: string) {
    return `supply:${pillar}:${module}:${userId}`;
  }

  supplyIdGenerator(userId: string, pillar: string, module: string) {
    return `${userId}-${pillar}-${module}`;
  }

  /**
   * Monta o texto dos dados do(s) pilar(es) para o Gemini. Para os 3 pilares,
   * usa o próprio dado; para `perfect-plain`, combina os 3 (reaproveitamento).
   */
  private async buildDnaPrompt(id: string, pillar: string): Promise<string> {
    if (pillar === 'perfect-plain') {
      try {
        const [hd, num, astro] = await Promise.all([
          this.humanDesignService.findOneByUser(id),
          this.numerologyService.findOneByUser(id),
          this.astrologyService.findOneByUser(id),
        ]);
        return `${hd.toPrompt()}\n${num.toPrompt()}\n${astro.toPrompt()}`;
      } catch {
        throw new ConflictException(
          'Gere os dados dos 3 pilares (Desenho Humano, Numerologia e Astrologia) antes de criar o Plano Perfeito.',
        );
      }
    }
    if (pillar === 'human-design') {
      return (await this.humanDesignService.findOneByUser(id)).toPrompt();
    }
    if (pillar === 'numerology') {
      return (await this.numerologyService.findOneByUser(id)).toPrompt();
    }
    if (pillar === 'astrology') {
      return (await this.astrologyService.findOneByUser(id)).toPrompt();
    }
    throw new ConflictException(`Pilar "${pillar}" inválido.`);
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
      return existingSupply;
    }
    const user = await this.users.findOne(id);
    const dnaPrompt = await this.buildDnaPrompt(id, pillar);
    const mainPrompt = await this.prompts.findByPillar('main');
    const prompt = await this.prompts.findByPillarAndModule(pillar, module);
    const topics = await this.gemini.generateTopics(
      `${mainPrompt[0].prompt}\n${prompt.prompt}\n${dnaPrompt}\n${user.toUserDataPrompt()}`,
    );
    const supply = new Supply(pillar, module, user.id, topics);
    const created = await this.supplyRepository.create(supply);
    // Invalida cache de leitura desse módulo (foi (re)gerado).
    await this.cache.del(this.supplyCacheKey(pillar, module, id));
    return created;
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
        modules = validPerfectPlainModules;
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
      'perfect-plain': validPerfectPlainModules,
    };
    const expectedModules = validModulesMap[pillar];
    return expectedModules.every((e) => supplies.some((s) => s.module === e))
  }

  async findHumanDesignModuleByUserId(
    userId: string,
    module: HumanDesignModuleType,
  ) {
    return this.readModule(userId, 'human-design', module);
  }

  async findNumerologyModuleByUserId(userId: string, module: string) {
    return this.readModule(userId, 'numerology', module);
  }

  async findAstrologyModuleByUserId(userId: string, module: string) {
    return this.readModule(userId, 'astrology', module);
  }

  async findPerfectPlainByUserId(userId: string) {
    return this.readModule(userId, 'perfect-plain', 'perfect-plain');
  }

  private readModule(userId: string, pillar: string, module: string) {
    return this.cache.getOrSet(
      this.supplyCacheKey(pillar, module, userId),
      SUPPLY_CACHE_TTL,
      async () => {
        const supply = await this.supplyRepository.findById(
          `${userId}-${pillar}-${module}`,
        );
        if (!supply) {
          throw new NotFoundException(
            'Nenhum material encontrado com essas informações',
          );
        }
        return supply;
      },
    );
  }
}
