import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Contas no Firebase Auth (spec 010): cadastro por convite (sem senha) e
 * remoção idempotente. Login, refresh e senha provisória deixaram de existir.
 */
describe('AuthService — contas no Firebase Auth', () => {
  let service: AuthService;
  let firebaseAuth: {
    createUser: jest.Mock;
    setCustomUserClaims: jest.Mock;
    deleteUser: jest.Mock;
    getUser: jest.Mock;
    getUsers: jest.Mock;
  };

  beforeEach(() => {
    firebaseAuth = {
      createUser: jest.fn().mockResolvedValue({ uid: 'uid-novo' }),
      setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
      deleteUser: jest.fn().mockResolvedValue(undefined),
      getUser: jest.fn(),
      getUsers: jest.fn().mockResolvedValue([]),
    };
    service = new AuthService(firebaseAuth as any);
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
    const record = (emailVerified: boolean, hasPassword: boolean) => ({
      uid: 'uid-1',
      email: 'ana@dna.com',
      emailVerified,
      providerData: hasPassword ? [{ providerId: 'password' }] : [],
    });

    it('sem senha (convite ainda não aberto) → convite pendente', async () => {
      firebaseAuth.getUser.mockResolvedValue(record(false, false));
      await expect(service.findAccount('uid-1')).resolves.toEqual({
        email: 'ana@dna.com',
        accessStatus: 'invite_pending',
      });
    });

    it('com senha e e-mail não confirmado → e-mail não verificado', async () => {
      firebaseAuth.getUser.mockResolvedValue(record(false, true));
      await expect(service.findAccount('uid-1')).resolves.toMatchObject({
        accessStatus: 'email_unverified',
      });
    });

    it('conta migrada com senha que nunca entrou → e-mail não verificado, não convite', async () => {
      firebaseAuth.getUser.mockResolvedValue({
        ...record(false, true),
        metadata: { lastSignInTime: null },
      });
      await expect(service.findAccount('uid-1')).resolves.toMatchObject({
        accessStatus: 'email_unverified',
      });
    });

    it('e-mail confirmado → ativo', async () => {
      firebaseAuth.getUser.mockResolvedValue(record(true, true));
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

  describe('findEmailsByIds', () => {
    it('busca em lote e devolve uid → e-mail (quem não existe fica de fora)', async () => {
      firebaseAuth.getUsers.mockResolvedValue([
        { uid: 'a', email: 'a@dna.com' },
        { uid: 'b', email: undefined },
      ]);

      const emails = await service.findEmailsByIds(['a', 'b', 'c']);

      expect(firebaseAuth.getUsers).toHaveBeenCalledWith(['a', 'b', 'c']);
      expect([...emails.entries()]).toEqual([['a', 'a@dna.com']]);
    });

    it('lista vazia não chama o Firebase', async () => {
      await expect(service.findEmailsByIds([])).resolves.toEqual(new Map());
      expect(firebaseAuth.getUsers).not.toHaveBeenCalled();
    });
  });
});
