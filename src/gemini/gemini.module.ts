import { Module } from '@nestjs/common';
import { GeminiController } from './gemini.controller';
import { GeminiService } from './gemini.service';
import { GeminiProvider } from './gemini.provider';
import { UsersModule } from 'src/users/users.module';
import { HumanDesignModule } from 'src/human-design/human-design.module';

@Module({
    controllers: [GeminiController],
    providers: [GeminiService, GeminiProvider],
    imports: [UsersModule, HumanDesignModule]
})
export class GeminiModule {}
