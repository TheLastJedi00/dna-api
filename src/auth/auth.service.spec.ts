import { NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Auth } from './entities/auth.entity';

/**
 * Cadastro e senha provisória (spec 005). Login, refresh e troca de senha
 * saíram na spec 010 (Firebase Auth); o cadastro migra para o Firebase na Fase 2.
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
    service = new AuthService(repo as any, bcrypt);
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

  describe('expiração da senha provisória (72h)', () => {
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
  });
});
