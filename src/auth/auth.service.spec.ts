import { ConflictException, NotFoundException } from '@nestjs/common';
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
  let firebaseAuth: {
    createUser: jest.Mock;
    setCustomUserClaims: jest.Mock;
    deleteUser: jest.Mock;
  };

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
    firebaseAuth = {
      createUser: jest.fn().mockResolvedValue({ uid: 'uid-novo' }),
      setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
      deleteUser: jest.fn().mockResolvedValue(undefined),
    };
    service = new AuthService(repo as any, bcrypt, firebaseAuth as any);
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

  describe('createAccount (convite, spec 010)', () => {
    it('cria no Firebase sem senha, com e-mail não verificado, e grava as roles nas claims', async () => {
      await expect(
        service.createAccount('ana@dna.com', ['USER']),
      ).resolves.toEqual({ id: 'uid-novo' });

      expect(firebaseAuth.createUser).toHaveBeenCalledWith({
        email: 'ana@dna.com',
        emailVerified: false,
      });
      expect(firebaseAuth.setCustomUserClaims).toHaveBeenCalledWith(
        'uid-novo',
        { roles: ['USER'] },
      );
    });

    it('e-mail já existente no Firebase → 409 "Email já cadastrado."', async () => {
      firebaseAuth.createUser.mockRejectedValue(
        Object.assign(new Error('exists'), {
          code: 'auth/email-already-exists',
        }),
      );
      const promise = service.createAccount('ana@dna.com', ['USER']);
      await expect(promise).rejects.toBeInstanceOf(ConflictException);
      await expect(promise).rejects.toThrow('Email já cadastrado.');
    });

    it('falha ao gravar as claims: apaga a conta recém-criada e propaga o erro', async () => {
      firebaseAuth.setCustomUserClaims.mockRejectedValue(new Error('claims'));
      await expect(
        service.createAccount('ana@dna.com', ['USER']),
      ).rejects.toThrow('claims');
      expect(firebaseAuth.deleteUser).toHaveBeenCalledWith('uid-novo');
    });
  });

  describe('removeAccount', () => {
    it('apaga a conta do Firebase', async () => {
      await service.removeAccount('uid-1');
      expect(firebaseAuth.deleteUser).toHaveBeenCalledWith('uid-1');
    });

    it('conta que já não existe não é erro (idempotente)', async () => {
      firebaseAuth.deleteUser.mockRejectedValue(
        Object.assign(new Error('nf'), { code: 'auth/user-not-found' }),
      );
      await expect(service.removeAccount('uid-1')).resolves.toBeUndefined();
    });
  });
});
