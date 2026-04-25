import { Body, Controller, Post } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { RequestDto } from './request.dto';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly service: GeminiService) {}
  @Post()
  async requestGemini(@Body() content: RequestDto) {
    try {
      await this.service.request(content);
    } catch (e) {
      throw new Error(`[Controller] ${e}`);
    }
  }
}
