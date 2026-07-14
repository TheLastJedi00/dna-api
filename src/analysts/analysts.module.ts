import { Module } from '@nestjs/common';
import { AnalystsService } from './analysts.service';
import { AnalystsController } from './analysts.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Importa UsersModule pelo UsersRepository: Analistas são perfis da coleção
 * `users`. A dependência é de mão única (users não conhece analysts), então não
 * há ciclo entre os módulos.
 */
@Module({
  controllers: [AnalystsController],
  providers: [AnalystsService],
  exports: [AnalystsService],
  imports: [UsersModule, AuthModule],
})
export class AnalystsModule {}
