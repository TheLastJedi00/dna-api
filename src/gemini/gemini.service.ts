import { Injectable } from '@nestjs/common';
import { GeminiProvider } from './gemini.provider';
import { RequestDto } from './request.dto';

@Injectable()
export class GeminiService {
  constructor(private readonly gemini: GeminiProvider) {}

  async request(content: RequestDto) {
    try {
      await this.gemini.main(content.content);
    } catch {
      throw Error();
    }
  }
}
