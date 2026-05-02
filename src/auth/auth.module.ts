import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthGuard } from './guards/auth.guard';
import { BcryptService } from './bcrypt.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AuthGuard, BcryptService],
  exports: [AuthService],
  imports: [JwtModule.registerAsync({
    global: true,
    inject: [ConfigService],
    useFactory:  (configService: ConfigService) => {
      return {
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {expiresIn: '3h'}
      }
    },
  })]
})
export class AuthModule {}
