import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Contas no Firebase Auth (spec 010): cadastro por convite (sem senha) e
 * remoção idempotente. Login, refresh e senha provisória deixaram de existir.
 */
describe('AuthService — contas no Firebase Auth', () => {
  let service: AuthService;
  let repo: {
    create: jest.Mock;
    update: jest.Mock;
    findById: jest.Mock;
    findByEmail: jest.Mock;
  };
  let firebaseAuth: {
    createUser: jest.Mock;
    setCustomUserClaims: jest.Mock;
    deleteUser: jest.Mock;
    getUser: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      create: jest.fn().mockResolvedValue({ id: 'u1' }),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue(null),
    };
    firebaseAuth = {
      createUser: jest.fn().mockResolvedValue({ uid: 'uid-novo' }),
      setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
      deleteUser: jest.fn().mockResolvedValue(undefined),
      getUser: jest.fn(),
    };
    service = new AuthService(repo as any, firebaseAuth as any);
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

  describe('findAccount (status do acesso)', () => {
    const record = (emailVerified: boolean, lastSignInTime: string | null) => ({
      uid: 'uid-1',
      email: 'ana@dna.com',
      emailVerified,
      metadata: { lastSignInTime },
    });

    it('nunca entrou e e-mail não verificado → convite pendente', async () => {
      firebaseAuth.getUser.mockResolvedValue(record(false, null));
      await expect(service.findAccount('uid-1')).resolves.toEqual({
        email: 'ana@dna.com',
        accessStatus: 'invite_pending',
      });
    });

    it('já entrou mas não confirmou o e-mail → e-mail não verificado', async () => {
      firebaseAuth.getUser.mockResolvedValue(
        record(false, 'Mon, 23 Nov 2026 10:00:00 GMT'),
      );
      await expect(service.findAccount('uid-1')).resolves.toMatchObject({
        accessStatus: 'email_unverified',
      });
    });

    it('e-mail confirmado → ativo', async () => {
      firebaseAuth.getUser.mockResolvedValue(
        record(true, 'Mon, 23 Nov 2026 10:00:00 GMT'),
      );
      await expect(service.findAccount('uid-1')).resolves.toMatchObject({
        accessStatus: 'active',
      });
    });

    it('conta inexistente no Firebase → null', async () => {
      firebaseAuth.getUser.mockRejectedValue(
        Object.assign(new Error('nf'), { code: 'auth/user-not-found' }),
      );
      await expect(service.findAccount('uid-1')).resolves.toBeNull();
    });
  });
});
