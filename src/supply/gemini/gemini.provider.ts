import { GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GeminiProvider {
  private readonly ai = new GoogleGenAI({});

  async main(content: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: content,
      });
      console.log(response.text);
    } catch {
      throw Error();
    }
  }
}
