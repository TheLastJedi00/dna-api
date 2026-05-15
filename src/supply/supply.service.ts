import { Injectable } from '@nestjs/common';
import { GeminiProvider } from './gemini/gemini.provider';
import { RequestDto } from './dtos/request.dto';
import { UsersService } from 'src/users/users.service';
import { HumanDesignService } from 'src/human-design/human-design.service';
import { PromptsService } from 'src/prompts/prompts.service';
import { Supply, validHumanDesignModules } from './entities/supply.entity';
import { SupplyRepository } from './supply.repository';
import { Prompt } from 'src/prompts/entities/prompt.entity';

@Injectable()
export class SupplyService {
  constructor(
    private readonly gemini: GeminiProvider,
    private readonly humanDesign: HumanDesignService,
    private readonly users: UsersService,
    private readonly prompts: PromptsService,
    private readonly supplies: SupplyRepository
  ) {}

  async request(content: RequestDto) {
    await this.gemini.generateTopics(content.content);
  }

  async createModuleByUserIdAndPillar(id: string, pillar: string, module: string) {
    const user = await this.users.findOne(id);
    const dhData = await this.humanDesign.findOneByUser(id);
    const mainPrompt = await this.prompts.findByPillar('main')
    const prompt = await this.prompts.findByPillarAndModule(pillar, module)
    const topics = await this.gemini.generateTopics(`${mainPrompt[0].prompt}\n${prompt.prompt}\n${dhData.toPrompt()}\n${user.toUserDataPrompt()}`);
    const supply = new Supply(pillar, module, user.id, topics)
    return await this.supplies.create(supply)
  }

  async createFullPillarByUserId(userId: string, pillar: string){
    let createdModules: Supply[] = []
    for(const m of validHumanDesignModules){
      const module = await this.createModuleByUserIdAndPillar(userId, pillar, m)
      createdModules.push(module);
    }
    return createdModules;
  }

  async checkSupplyByUserId(userId: string, pillar: string){
    return await this.supplies.checkSupplyByUserId(userId, pillar);
  }
}
