import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService
  ){}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token: string = request.headers.authorization?.split(' ')[1]
    if(!token){
      throw new UnauthorizedException('Acesso não autorizado.')
    }
    try {
      const authData = await this.jwtService.verifyAsync(token)
      request['auth'] = authData
    } catch {
      throw new UnauthorizedException('Acesso inválido ou expirado')
    }
    return true
  }
}
