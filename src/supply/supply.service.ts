import { Injectable } from '@nestjs/common';
import { GeminiProvider } from './gemini/gemini.provider';
import { RequestDto } from './dtos/request.dto';
import { UsersService } from 'src/users/users.service';
import { HumanDesignService } from 'src/human-design/human-design.service';
import { PromptsService } from 'src/prompts/prompts.service';
import { Supply } from './entities/supply.entity';
import { SupplyRepository } from './supply.repository';

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

  async createModuleById(id: string, pillar: string, module: string) {
    const user = await this.users.findOne(id);
    const dhData = await this.humanDesign.findOneByUser(id);
    const mainPrompt = await this.prompts.findByPillar('main')
    const prompt = await this.prompts.findByPillarAndModule(pillar, module)
    const topics = await this.gemini.generateTopics(`${mainPrompt.prompt}\n${prompt.prompt}\n${dhData.toPrompt()}\n${user.toUserDataPrompt()}`);
    const supply = new Supply(pillar, module, user.id, topics)
    return await this.supplies.create(supply)
  }
}
