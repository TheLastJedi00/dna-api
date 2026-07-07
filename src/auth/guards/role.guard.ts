import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../../enums/role.enum';
import { ROLES_KEY } from '../../decorators/role.decorator';

/**
 * Verifica os papéis exigidos pela rota reaproveitando o payload já validado
 * pelo AuthGuard (request.auth). Não reverifica o JWT — depende de AuthGuard
 * estar antes na cadeia de @UseGuards.
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Roles[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const auth = request.auth;
    if (!auth) {
      throw new UnauthorizedException('Acesso negado ou expirado.');
    }

    const roles: string[] = auth.roles ?? [];
    if (requiredRoles.some((role) => roles.includes(role))) {
      return true;
    }
    throw new ForbiddenException(
      'Credenciais de níveis mais altos são necessárias para essa ação.',
    );
  }
}
