import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AllowUnverified } from '../../decorators/allow-unverified.decorator';
import { FirebaseAuthAdapter } from '../../firebase/firebase-auth.adapter';
import { RequestAuth } from '../entities/request-auth';

type Req = { headers: Record<string, string>; auth?: RequestAuth };

class Rotas {
  comum() {}

  @AllowUnverified()
  perfil() {}
}

function contextFor(
  request: Req,
  handler: keyof Rotas = 'comum',
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => Rotas.prototype[handler],
    getClass: () => Rotas,
  } as unknown as ExecutionContext;
}

const decodedVerificado = {
  uid: 'uid-1',
  email: 'helena@exemplo.com',
  email_verified: true,
  roles: ['USER'],
  auth_time: 1_700_000_000,
};

describe('AuthGuard (ID token do Firebase)', () => {
  let firebaseAuth: { verifyIdToken: jest.Mock };
  let guard: AuthGuard;

  beforeEach(() => {
    firebaseAuth = {
      verifyIdToken: jest.fn().mockResolvedValue(decodedVerificado),
    };
    guard = new AuthGuard(
      firebaseAuth as unknown as FirebaseAuthAdapter,
      new Reflector(),
    );
  });

  it('sem header Authorization → 401', async () => {
    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(firebaseAuth.verifyIdToken).not.toHaveBeenCalled();
  });

  it('token inválido, expirado ou revogado → 401', async () => {
    firebaseAuth.verifyIdToken.mockRejectedValue(
      Object.assign(new Error('revoked'), { code: 'auth/id-token-revoked' }),
    );
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Bearer x' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('valida checando revogação e popula request.auth no formato usado pelos guards', async () => {
    const request: Req = {
      headers: { authorization: 'Bearer token-1' },
    };
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(firebaseAuth.verifyIdToken).toHaveBeenCalledWith('token-1', true);
    expect(request.auth).toEqual({
      id: 'uid-1',
      email: 'helena@exemplo.com',
      roles: ['USER'],
      emailVerified: true,
      authTime: 1_700_000_000,
    });
  });

  it('aceita o token sem o prefixo Bearer (compatível com o contrato anterior)', async () => {
    await guard.canActivate(
      contextFor({ headers: { authorization: 'token-2' } }),
    );
    expect(firebaseAuth.verifyIdToken).toHaveBeenCalledWith('token-2', true);
  });

  it('sem claim de roles → roles vazio (o RoleGuard nega o que exigir papel)', async () => {
    firebaseAuth.verifyIdToken.mockResolvedValue({
      ...decodedVerificado,
      roles: undefined,
    });
    const request: Req = {
      headers: { authorization: 'Bearer t' },
    };
    await guard.canActivate(contextFor(request));
    expect(request.auth?.roles).toEqual([]);
  });

  describe('e-mail não verificado', () => {
    beforeEach(() => {
      firebaseAuth.verifyIdToken.mockResolvedValue({
        ...decodedVerificado,
        email_verified: false,
      });
    });

    it('rota comum → 403 com code EMAIL_NOT_VERIFIED', async () => {
      const promise = guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer t' } }),
      );
      await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
      await promise.catch((e: ForbiddenException) => {
        expect(e.getResponse()).toMatchObject({
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Verifique seu e-mail para continuar.',
        });
      });
    });

    it('rota marcada com @AllowUnverified → liberada', async () => {
      const request: Req = {
        headers: { authorization: 'Bearer t' },
      };
      await expect(
        guard.canActivate(contextFor(request, 'perfil')),
      ).resolves.toBe(true);
      expect(request.auth?.emailVerified).toBe(false);
    });
  });
});
