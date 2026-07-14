import { NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Auth } from './entities/auth.entity';

/**
 * Cobre o ciclo da senha temporária (spec 005): ela nasce no cadastro, pode ser
 * regerada pelo painel, e some quando o usuário define a definitiva. E cobre o
 * que torna o bloqueio inescapável: o claim `mustChangePassword` no token,
 * preservado no refresh e zerado — com token novo — na troca.
 */
describe('AuthService — senha temporária', () => {
  let service: AuthService;
  let repo: {
    create: jest.Mock;
    update: jest.Mock;
    findById: jest.Mock;
    findByEmail: jest.Mock;
  };
  let bcrypt: { hash: jest.Mock; compare: jest.Mock };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let refreshStore: { store: jest.Mock; revoke: jest.Mock; isValid: jest.Mock };

  const credentialsOf = (partial: Partial<Auth> = {}) =>
    new Auth({
      id: 'u1',
      email: 'ana@dna.com',
      password: 'hash-antigo',
      roles: ['USER'],
      mustChangePassword: true,
      tempPassword: 'provisoria',
      ...partial,
    });

  beforeEach(() => {
    process.env.JWT_REFRESH_SECRET = 'segredo-de-teste';
    repo = {
      create: jest.fn().mockResolvedValue({ id: 'u1' }),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue(null),
    };
    bcrypt = {
      hash: jest.fn().mockImplementation((p: string) => `hash(${p})`),
      compare: jest.fn().mockResolvedValue(true),
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('token'),
      verifyAsync: jest.fn(),
    };
    refreshStore = {
      store: jest.fn(),
      revoke: jest.fn(),
      isValid: jest.fn().mockResolvedValue(true),
    };
    service = new AuthService(
      repo as any,
      bcrypt as any,
      jwt as any,
      refreshStore as any,
    );
  });

  describe('create', () => {
    it('a senha do cadastro já nasce provisória', async () => {
      await service.create({ email: 'ana@dna.com', password: 'inicial' }, [
        'USER',
      ]);

      const persisted = repo.create.mock.calls[0][0] as Auth;
      expect(persisted.password).toBe('hash(inicial)');
      expect(persisted.tempPassword).toBe('inicial');
      expect(persisted.mustChangePassword).toBe(true);
    });
  });

  describe('setTempPassword', () => {
    it('grava o hash, guarda o texto plano e liga a flag', async () => {
      repo.findById.mockResolvedValue(
        credentialsOf({ mustChangePassword: false, tempPassword: null }),
      );

      await service.setTempPassword('u1', 'nova-provisoria');

      expect(repo.update).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          password: 'hash(nova-provisoria)',
          mustChangePassword: true,
          tempPassword: 'nova-provisoria',
        }),
      );
    });

    it('404 quando as credenciais não existem', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.setTempPassword('x', 'y')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changePassword', () => {
    it('apaga o rastro da provisória e desliga a flag', async () => {
      repo.findById.mockResolvedValue(credentialsOf());

      await service.changePassword('u1', 'definitiva');

      expect(repo.update).toHaveBeenCalledWith('u1', {
        password: 'hash(definitiva)',
        mustChangePassword: false,
        tempPassword: null,
        tempPasswordExpiresAt: null,
      });
    });

    it('reemite o par de tokens sem o claim de troca obrigatória', async () => {
      repo.findById.mockResolvedValue(credentialsOf());

      const tokens = await service.changePassword('u1', 'definitiva');

      expect(tokens.access_token).toBeDefined();
      expect(tokens.refresh_token).toBeDefined();
      // Sem token novo, o access em mãos ainda diria mustChangePassword: true e
      // o usuário ficaria preso na tela de troca depois de já ter trocado.
      const claims = jwt.signAsync.mock.calls[0][0];
      expect(claims.mustChangePassword).toBe(false);
    });
  });

  describe('login', () => {
    it('leva o estado da senha para o claim e para o corpo da resposta', async () => {
      repo.findByEmail.mockResolvedValue(credentialsOf());

      const res = await service.loginByCredentials({
        email: 'ana@dna.com',
        password: 'provisoria',
      });

      expect(res.mustChangePassword).toBe(true);
      expect(jwt.signAsync.mock.calls[0][0].mustChangePassword).toBe(true);
    });

    it('quem já definiu a senha entra sem bloqueio', async () => {
      repo.findByEmail.mockResolvedValue(
        credentialsOf({ mustChangePassword: false, tempPassword: null }),
      );

      const res = await service.loginByCredentials({
        email: 'ana@dna.com',
        password: 'definitiva',
      });

      expect(res.mustChangePassword).toBe(false);
    });
  });

  describe('expiração da senha provisória (72h)', () => {
    const inThePast = new Date(Date.now() - 60_000).toISOString();
    const inTheFuture = new Date(Date.now() + 60_000).toISOString();

    it('o cadastro grava o prazo', async () => {
      await service.create({ email: 'ana@dna.com', password: 'inicial' }, [
        'USER',
      ]);

      const persisted = repo.create.mock.calls[0][0] as Auth;
      const deadline = new Date(persisted.tempPasswordExpiresAt!).getTime();
      const expected = Date.now() + 3 * 24 * 60 * 60 * 1000;
      expect(Math.abs(deadline - expected)).toBeLessThan(5_000);
    });

    it('a redefinição pelo painel renova o prazo', async () => {
      repo.findById.mockResolvedValue(credentialsOf());

      await service.setTempPassword('u1', 'outra-provisoria');

      const changes = repo.update.mock.calls[0][1];
      expect(new Date(changes.tempPasswordExpiresAt).getTime()).toBeGreaterThan(
        Date.now(),
      );
    });

    it('senha provisória vencida NÃO loga, mesmo estando correta', async () => {
      repo.findByEmail.mockResolvedValue(
        credentialsOf({ tempPasswordExpiresAt: inThePast }),
      );

      await expect(
        service.loginByCredentials({
          email: 'ana@dna.com',
          password: 'provisoria',
        }),
      ).rejects.toThrow('Senha temporária expirada. Peça uma nova ao seu gestor.');
      // A comparação nem chega a acontecer: o prazo barra antes.
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('ao vencer, o texto plano é apagado do banco', async () => {
      repo.findByEmail.mockResolvedValue(
        credentialsOf({ tempPasswordExpiresAt: inThePast }),
      );

      await service
        .loginByCredentials({ email: 'ana@dna.com', password: 'provisoria' })
        .catch(() => undefined);

      expect(repo.update).toHaveBeenCalledWith('u1', { tempPassword: null });
    });

    it('dentro do prazo, a senha provisória loga normalmente', async () => {
      repo.findByEmail.mockResolvedValue(
        credentialsOf({ tempPasswordExpiresAt: inTheFuture }),
      );

      const res = await service.loginByCredentials({
        email: 'ana@dna.com',
        password: 'provisoria',
      });

      expect(res.mustChangePassword).toBe(true);
    });

    it('senha definitiva não expira (sem prazo gravado)', async () => {
      repo.findByEmail.mockResolvedValue(
        credentialsOf({
          mustChangePassword: false,
          tempPassword: null,
          tempPasswordExpiresAt: null,
        }),
      );

      const res = await service.loginByCredentials({
        email: 'ana@dna.com',
        password: 'definitiva',
      });

      expect(res.mustChangePassword).toBe(false);
    });

    it('a troca definitiva limpa também o prazo', async () => {
      repo.findById.mockResolvedValue(credentialsOf());

      await service.changePassword('u1', 'definitiva');

      expect(repo.update.mock.calls[0][1].tempPasswordExpiresAt).toBeNull();
    });
  });

  describe('refresh', () => {
    it('preserva o bloqueio: renovar o token não escapa da troca obrigatória', async () => {
      jwt.verifyAsync.mockResolvedValue({
        id: 'u1',
        email: 'ana@dna.com',
        roles: ['USER'],
        mustChangePassword: true,
        jti: 'jti-1',
      });

      await service.refresh('refresh-valido');

      expect(jwt.signAsync.mock.calls[0][0].mustChangePassword).toBe(true);
    });
  });
});
