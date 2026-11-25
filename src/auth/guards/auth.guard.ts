import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseAuthAdapter } from '../../firebase/firebase-auth.adapter';
import { ALLOW_UNVERIFIED_KEY } from '../../decorators/allow-unverified.decorator';
import { RequestAuth } from '../entities/request-auth';

/** Código que o front usa para reabrir o popup de verificação de e-mail. */
export const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';

/**
 * Valida o **ID token do Firebase** (emitido pelo SDK web) e popula
 * `request.auth`. Também aplica a regra de e-mail confirmado: quem não
 * confirmou recebe 403, a não ser nas rotas marcadas com `@AllowUnverified()`.
 *
 * A regra mora aqui, e não num guard separado, porque todo controller
 * autenticado já passa por este guard — assim nenhuma rota esquece a checagem.
 * (Um guard global não serviria: guards globais rodam antes dos do controller,
 * quando `request.auth` ainda não existe.)
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly firebaseAuth: FirebaseAuthAdapter,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      auth?: RequestAuth;
    }>();
    const token = this.extractToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Acesso não autorizado.');
    }

    let decoded: Awaited<ReturnType<FirebaseAuthAdapter['verifyIdToken']>>;
    try {
      decoded = await this.firebaseAuth.verifyIdToken(token, true);
    } catch {
      throw new UnauthorizedException('Acesso inválido ou expirado.');
    }

    const roles: unknown = decoded.roles;
    const auth: RequestAuth = {
      id: decoded.uid,
      email: decoded.email ?? '',
      roles: Array.isArray(roles) ? roles.map(String) : [],
      emailVerified: decoded.email_verified === true,
      authTime: decoded.auth_time,
    };
    request.auth = auth;

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNVERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!auth.emailVerified && !allowUnverified) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Verifique seu e-mail para continuar.',
        code: EMAIL_NOT_VERIFIED,
      });
    }
    return true;
  }

  private extractToken(header: string | undefined): string | undefined {
    if (!header) return undefined;
    return header.startsWith('Bearer ') ? header.slice(7) : header;
  }
}
