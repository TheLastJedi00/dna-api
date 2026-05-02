import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Roles } from '../../enums/role.enum';
import { ROLES_KEY } from '../../decorators/role.decorator';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Roles[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const headerAuth: string = request.headers.authorization;
    if(!headerAuth){
      throw new UnauthorizedException("Acesso negado ou Expirado.")
    }
    const token = headerAuth.startsWith('Bearer')? headerAuth.split(' ')[1] : headerAuth;
    const user = await this.jwtService.verifyAsync(token)
    if(requiredRoles.some((role) => user.roles?.includes(role))){
      return true
    }
    throw new ForbiddenException("Credenciais de níveis mais altos são necessárias para essa ação.");
  }
}
