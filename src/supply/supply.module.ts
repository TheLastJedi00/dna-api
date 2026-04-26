import { Module } from '@nestjs/common';
import { SupplyController } from './supply.controller';
import { SupplyService } from './supply.service';
import { GeminiProvider } from './gemini/gemini.provider';
import { UsersModule } from '../users/users.module';
import { HumanDesignModule } from '../human-design/human-design.module';
import { PromptsModule } from '../prompts/prompts.module';

@Module({
    controllers: [SupplyController],
    providers: [SupplyService, GeminiProvider],
    imports: [UsersModule, HumanDesignModule, PromptsModule]
})
export class SupplyModule {}
