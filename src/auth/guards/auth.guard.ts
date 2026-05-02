import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const headerAuth: string = request.headers.authorization;
    const token = headerAuth?.startsWith('Bearer')
      ? headerAuth.split(' ')[1]
      : headerAuth;
    if (!token) {
      throw new UnauthorizedException('Acesso não autorizado.');
    }
    try {
      const authData = await this.jwtService.verifyAsync(token);
      request['auth'] = authData;
    } catch (e) {
      console.error(e);
      throw new UnauthorizedException('Acesso inválido ou expirado');
    }
    return true;
  }
}
