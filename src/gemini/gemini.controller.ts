import { Body, Controller, Param, Post } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { RequestDto } from './request.dto';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly service: GeminiService) {}
  
  @Post()
  async requestGemini(@Body() content: RequestDto) {
      await this.service.request(content);
  }

  @Post('aurico/:id')
  async createAuricoSupplyById(@Param('id') id:string){
    return await this.service.createAuricoSupplyById(id);
  }
}
