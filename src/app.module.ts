import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HumanDesignController } from './human-design/human-design.controller';
import { HumanDesignService } from './human-design/human-design.service';
import { HumanDesignModule } from './human-design/human-design.module';
import { HumanDesignModule } from './human-design/human-design.module';
import { HumanDesignModule } from './human-design/human-design.module';

@Module({
  imports: [HumanDesignModule],
  controllers: [AppController, HumanDesignController],
  providers: [AppService, HumanDesignService],
})
export class AppModule {}
