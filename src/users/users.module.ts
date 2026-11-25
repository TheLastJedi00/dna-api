import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { AuthModule } from '../auth/auth.module';
import { AccountDeletionService } from '../account/account-deletion.service';
import { AccountDataRepository } from '../account/account-data.repository';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    AccountDeletionService,
    AccountDataRepository,
  ],
  // UsersRepository é exportado porque Analistas são documentos da mesma
  // coleção `users` (roles: ANALYST) — o módulo de Analistas reusa este
  // repositório em vez de abrir um segundo acesso à mesma coleção.
  exports: [UsersService, UsersRepository],
  imports: [AuthModule],
})
export class UsersModule {}
