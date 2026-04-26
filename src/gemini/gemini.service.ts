import { Injectable } from '@nestjs/common';
import { GeminiProvider } from './gemini.provider';
import { RequestDto } from './request.dto';
import { UsersService } from 'src/users/users.service';
import { HumanDesignService } from 'src/human-design/human-design.service';

@Injectable()
export class GeminiService {
  constructor(
    private readonly gemini: GeminiProvider,
    private readonly humanDesign: HumanDesignService,
    private readonly users: UsersService,
  ) {}

  async request(content: RequestDto) {
    await this.gemini.main(content.content);
  }

  async createAuricoSupplyById(id: string) {
    const user = await this.users.findOne(id);
    const dhData = await this.humanDesign.findOneByUser(id);
    const gemini = await this.gemini.main(
      `Baseado em tudo conhecido sobre o Desenho Humano (Human Design), faça um resumo pessoal em segunda pessoa de forma a aconselhar como usar isso para melhorar o desempenho no seu negócio, nome ${user.fullName} e os dados de desenho humano são tipo: ${dhData.tipo_aurico}, ${dhData.aura}`,
    );
  }
}
