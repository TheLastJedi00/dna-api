import { Injectable } from '@nestjs/common';
import { GeminiProvider } from './gemini/gemini.provider';
import { RequestDto } from './dtos/request.dto';
import { UsersService } from 'src/users/users.service';
import { HumanDesignService } from 'src/human-design/human-design.service';
import { PromptsService } from 'src/prompts/prompts.service';

@Injectable()
export class SupplyService {
  constructor(
    private readonly gemini: GeminiProvider,
    private readonly humanDesign: HumanDesignService,
    private readonly users: UsersService,
    private readonly prompts: PromptsService
  ) {}

  async request(content: RequestDto) {
    await this.gemini.main(content.content);
  }

  async createAuricoSupplyById(id: string) {
    const user = await this.users.findOne(id);
    const dhData = await this.humanDesign.findOneByUser(id);
    const prompt = await this.prompts.findByCategory('human-design')
    const gemini = await this.gemini.main(`${prompt}\n${user}\nTipo áurico: ${dhData.tipo_aurico}`);
  }
}
