import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../enums/role.enum';

/**
 * Garante que o requisitante só acesse recursos do próprio usuário.
 * Compara o `:userId` da rota com o id do token (populado por AuthGuard em request.auth).
 * ADMIN e MANAGER têm acesso irrestrito. Requer AuthGuard antes na cadeia.
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth = request.auth;
    if (!auth) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const roles: string[] = auth.roles ?? [];
    if (roles.includes(Roles.ADMIN) || roles.includes(Roles.MANAGER)) {
      return true;
    }

    const userIdFromRoute: string | undefined = request.params?.userId;
    if (userIdFromRoute && auth.id === userIdFromRoute) {
      return true;
    }

    throw new ForbiddenException(
      'Você só pode acessar os próprios dados.',
    );
  }
}
