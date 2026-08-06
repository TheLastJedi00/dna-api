import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';

import { UserLoginDto } from '../users/dto/create-user.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from './guards/auth.guard';
import { Ownership } from '../decorators/ownership.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  login(@Body() credentials: UserLoginDto){
    return this.authService.loginByCredentials(credentials)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() { refresh_token }: RefreshDto) {
    return this.authService.refresh(refresh_token);
  }

  /**
   * O usuário define a própria senha definitiva. O id sai do token, nunca do
   * corpo — senão qualquer autenticado trocaria a senha de outro. Devolve um par
   * de tokens novo (sem o claim de troca obrigatória).
   */
  @Post('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Ownership('id') userId: string,
    @Body() { password }: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, password);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() { refresh_token }: RefreshDto) {
    await this.authService.logout(refresh_token);
  }
}
