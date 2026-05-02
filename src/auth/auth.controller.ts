import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

import { UserLoginDto } from 'src/users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  login(@Body() credentials: UserLoginDto){
    return this.authService.loginByCredentials(credentials)
  }

}
