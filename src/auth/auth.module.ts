import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthGuard } from './guard/auth.guard';
import { BcryptService } from './bcrypt.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AuthGuard, BcryptService],
  exports: [AuthService]
})
export class AuthModule {}
