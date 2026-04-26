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
    await this.gemini.main(content.content);
  }

  async createAuricoSupplyById(id: string) {
    const user = await this.users.findOne(id);
    const dhData = await this.humanDesign.findOneByUser(id);
    const mainPrompt = await this.prompts.findByCategory('main')
    const prompt = await this.prompts.findByCategory('human-design')
    const topics = await this.gemini.main(`${mainPrompt.prompt}\n${prompt.prompt}\nDados Maestra: ${user.toUserDataPrompt()}\nDados Desenho Humano:${dhData.toTipoAuricoPrompt()}`);
    const supply = new Supply("human-design", "tipo-aurico", user.id, topics)
    return await this.supplies.create(supply)
  }
}
