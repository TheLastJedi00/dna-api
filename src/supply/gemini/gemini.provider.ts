import { GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';
import { z } from "zod"
import { Topic } from '../entities/supply.entity';

@Injectable()
export class GeminiProvider {
  private readonly ai = new GoogleGenAI({});

  topicSchema = z.object({
      title: z.string().describe("Nome do respectivo tópico"),
      items: z.array(z.string().describe("Item do array de itens desse tópico"))
  })

  topicArraySchema = z.array(this.topicSchema)

  async generateTopics(content: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: content,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: this.topicArraySchema
        }
      });
      const responseData = response.text
      if(!responseData){
        throw new Error("[Gemini Provider] Nenhuma resposta encontrada")
      }
      const json: any[] = JSON.parse(responseData)
      let topics: Topic[] = json.map(data => new Topic(data))
      return topics
    } catch(e) {
      throw new Error(`Erro em Gemini Provider: ${e}`);
    }
  }
}
