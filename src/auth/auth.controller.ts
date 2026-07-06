import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

import { UserLoginDto } from '../users/dto/create-user.dto';
import { RefreshDto } from './dto/refresh.dto';

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

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() { refresh_token }: RefreshDto) {
    await this.authService.logout(refresh_token);
  }
}
