import { Module } from '@nestjs/common';
import { GeminiController } from './gemini.controller';
import { GeminiService } from './gemini.service';
import { GeminiProvider } from './gemini.provider';

@Module({
    controllers: [GeminiController],
    providers: [GeminiService, GeminiProvider]
})
export class GeminiModule {}
