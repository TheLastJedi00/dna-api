import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthGuard } from './guard/auth.guard';
import { BcryptPipe } from './pipes/bcrypt.pipe';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AuthGuard, BcryptPipe],
  exports: [AuthService]
})
export class AuthModule {}
