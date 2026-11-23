import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { AuthGuard } from './guards/auth.guard';

/**
 * Sessão é do Firebase Auth (spec 010): o front entra pelo SDK web e a API só
 * valida o ID token no `AuthGuard`. Sem endpoints de login/refresh/logout.
 */
@Module({
  providers: [AuthService, AuthRepository, AuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
