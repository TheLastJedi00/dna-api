import { UnauthorizedException } from '@nestjs/common';
import { AccountDeletionService } from './account-deletion.service';
import { AccountDataRepository } from './account-data.repository';
import { AuthService } from '../auth/auth.service';
import { CacheService } from '../redis/cache.service';
import { RequestAuth } from '../auth/entities/request-auth';

/**
 * Exclusão da própria conta (LGPD, spec 010): exige login recente, apaga
 * todos os dados da pessoa e, por último, a conta no Firebase Auth.
 */
describe('AccountDeletionService', () => {
  const NOW = 1_800_000_000; // segundos
  let data: {
    findSupplyModules: jest.Mock;
    deleteUserData: jest.Mock;
  };
  let auth: { removeAccount: jest.Mock };
  let cache: { del: jest.Mock };
  let calls: string[];
  let service: AccountDeletionService;

  const requester = (authTime: number): RequestAuth => ({
    id: 'uid-1',
    email: 'ana@dna.com',
    roles: ['USER'],
    emailVerified: true,
    authTime,
  });

  beforeEach(() => {
    calls = [];
    data = {
      findSupplyModules: jest.fn().mockResolvedValue([
        { pillar: 'numerology', module: 'destino' },
        { pillar: 'perfect-plain', module: 'perfect-plain' },
      ]),
      deleteUserData: jest.fn().mockImplementation(() => {
        calls.push('dados');
        return Promise.resolve();
      }),
    };
    auth = {
      removeAccount: jest.fn().mockImplementation(() => {
        calls.push('firebase');
        return Promise.resolve();
      }),
    };
    cache = {
      del: jest.fn().mockImplementation(() => {
        calls.push('cache');
        return Promise.resolve();
      }),
    };
    service = new AccountDeletionService(
      data as unknown as AccountDataRepository,
      auth as unknown as AuthService,
      cache as unknown as CacheService,
      () => NOW,
    );
  });

  it('login há mais de 5 minutos → 401 pedindo a senha, sem apagar nada', async () => {
    const promise = service.deleteOwnAccount(requester(NOW - 301));
    await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(promise).rejects.toThrow(
      'Confirme sua senha para excluir a conta.',
    );
    expect(data.deleteUserData).not.toHaveBeenCalled();
    expect(auth.removeAccount).not.toHaveBeenCalled();
  });

  it('login recente: apaga dados, cache e por último a conta do Firebase', async () => {
    await service.deleteOwnAccount(requester(NOW - 60));

    expect(data.deleteUserData).toHaveBeenCalledWith('uid-1');
    expect(cache.del).toHaveBeenCalledWith(
      'supply:numerology:destino:uid-1',
      'supply:perfect-plain:perfect-plain:uid-1',
      'dna-status:uid-1',
    );
    expect(auth.removeAccount).toHaveBeenCalledWith('uid-1');
    expect(calls).toEqual(['dados', 'cache', 'firebase']);
  });

  it('o id sai do token: não há como apagar a conta de outra pessoa', async () => {
    await service.deleteOwnAccount(requester(NOW));
    expect(data.deleteUserData.mock.calls).toEqual([['uid-1']]);
  });

  it('falha no meio: a conta do Firebase fica, e repetir termina o serviço', async () => {
    data.deleteUserData.mockRejectedValueOnce(new Error('firestore fora'));

    await expect(service.deleteOwnAccount(requester(NOW))).rejects.toThrow(
      'firestore fora',
    );
    expect(auth.removeAccount).not.toHaveBeenCalled();

    await expect(
      service.deleteOwnAccount(requester(NOW)),
    ).resolves.toBeUndefined();
    expect(auth.removeAccount).toHaveBeenCalledWith('uid-1');
  });
});
