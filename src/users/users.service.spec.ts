import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

/** Usuário cadastrado por `createdBy` — o vínculo que governa a visibilidade. */
function userOf(fullName: string, createdBy?: string): User {
  const owned = new User(
    {
      fullName,
      birthDate: '2000-01-01',
      birthTime: '00:00',
      birthPlace: 'Floripa-SC',
      createdBy,
    },
    fullName,
    ['USER'],
  );
  return owned;
}

/**
 * Cobre a lógica nova do CRUD de usuários: listagem paginada com busca por nome
 * e filtro de status, reativação e edição. Repositório e auth mockados.
 */
function makeUser(fullName: string, isActive = true, id = fullName): User {
  const u = new User(
    {
      fullName,
      birthDate: '2000-01-01',
      birthTime: '00:00',
      birthPlace: 'Floripa-SC',
    },
    id,
    ['USER'],
  );
  u.isActive = isActive;
  return u;
}

/** Requisitante ADMIN: super-usuário, enxerga e gerencia todos os usuários. */
const admin = { requesterId: 'admin-1', requesterRoles: ['ADMIN'] };

describe('UsersService — CRUD de usuários', () => {
  let service: UsersService;
  let repo: {
    findAllWithRole: jest.Mock;
    findById: jest.Mock;
    findByIds: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  let auth: {
    createAccount: jest.Mock;
    removeAccount: jest.Mock;
    findEmailsByIds: jest.Mock;
    findAccount: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      findAllWithRole: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((_id, u) => Promise.resolve(u)),
      create: jest.fn(),
    };
    auth = {
      createAccount: jest.fn(),
      removeAccount: jest.fn().mockResolvedValue(undefined),
      findEmailsByIds: jest.fn().mockResolvedValue(new Map()),
      findAccount: jest.fn().mockResolvedValue(null),
    };
    service = new UsersService(repo as any, auth as any);
  });

  describe('findAllActiveUsers (listagem)', () => {
    it('pagina e devolve metadados total/page/pageSize', async () => {
      repo.findAllWithRole.mockResolvedValue([
        makeUser('Ana'),
        makeUser('Bruna'),
        makeUser('Carla'),
      ]);
      const res = await service.findAllActiveUsers({
        ...admin,
        orderBy: 'fullName',
        direction: 'asc',
        page: 1,
        pageSize: 2,
      });
      expect(res.total).toBe(3);
      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(2);
      expect(res.items.map((u) => u.fullName)).toEqual(['Ana', 'Bruna']);
    });

    it('segunda página traz o restante', async () => {
      repo.findAllWithRole.mockResolvedValue([
        makeUser('Ana'),
        makeUser('Bruna'),
        makeUser('Carla'),
      ]);
      const res = await service.findAllActiveUsers({
        ...admin,
        orderBy: 'fullName',
        direction: 'asc',
        page: 2,
        pageSize: 2,
      });
      expect(res.items.map((u) => u.fullName)).toEqual(['Carla']);
    });

    it('ordena desc', async () => {
      repo.findAllWithRole.mockResolvedValue([
        makeUser('Ana'),
        makeUser('Carla'),
        makeUser('Bruna'),
      ]);
      const res = await service.findAllActiveUsers({
        ...admin,
        orderBy: 'fullName',
        direction: 'desc',
      });
      expect(res.items.map((u) => u.fullName)).toEqual([
        'Carla',
        'Bruna',
        'Ana',
      ]);
    });

    it('status=active (default) esconde inativas', async () => {
      repo.findAllWithRole.mockResolvedValue([
        makeUser('Ana', true),
        makeUser('Bruna', false),
      ]);
      const res = await service.findAllActiveUsers({
        ...admin,
        orderBy: 'fullName',
        direction: 'asc',
      });
      expect(res.total).toBe(1);
      expect(res.items[0].fullName).toBe('Ana');
    });

    it('status=inactive mostra só inativas', async () => {
      repo.findAllWithRole.mockResolvedValue([
        makeUser('Ana', true),
        makeUser('Bruna', false),
      ]);
      const res = await service.findAllActiveUsers({
        ...admin,
        orderBy: 'fullName',
        direction: 'asc',
        status: 'inactive',
      });
      expect(res.items.map((u) => u.fullName)).toEqual(['Bruna']);
    });

    it('status=all mostra ativas e inativas', async () => {
      repo.findAllWithRole.mockResolvedValue([
        makeUser('Ana', true),
        makeUser('Bruna', false),
      ]);
      const res = await service.findAllActiveUsers({
        ...admin,
        orderBy: 'fullName',
        direction: 'asc',
        status: 'all',
      });
      expect(res.total).toBe(2);
    });

    it('busca por nome é parcial e case-insensitive', async () => {
      repo.findAllWithRole.mockResolvedValue([
        makeUser('Ana Paula'),
        makeUser('Bruna'),
        makeUser('Mariana'),
      ]);
      const res = await service.findAllActiveUsers({
        ...admin,
        orderBy: 'fullName',
        direction: 'asc',
        name: 'ANA',
      });
      expect(res.items.map((u) => u.fullName)).toEqual([
        'Ana Paula',
        'Mariana',
      ]);
    });

    it('direção inválida lança BadRequest', async () => {
      await expect(
        service.findAllActiveUsers({
          ...admin,
          orderBy: 'fullName',
          direction: 'up',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('createUser (convite: conta no Firebase sem senha)', () => {
    const data = {
      fullName: 'Ana',
      birthDate: '2000-01-01',
      birthTime: '00:00',
      birthPlace: 'Floripa-SC',
      email: 'ana@dna.com',
    };

    it('cria a conta com role USER e grava o perfil com o uid e o criador do token', async () => {
      auth.createAccount.mockResolvedValue({ id: 'uid-ana' });

      await service.createUser(data, 'analyst-1');

      expect(auth.createAccount).toHaveBeenCalledWith('ana@dna.com', ['USER']);
      const persisted = repo.create.mock.calls[0][0] as User;
      expect(persisted.id).toBe('uid-ana');
      expect(persisted.createdBy).toBe('analyst-1');
      expect(persisted.roles).toEqual(['USER']);
      expect(persisted.email).toBe('ana@dna.com');
    });

    it('devolve o id criado (o front dispara o convite em seguida)', async () => {
      auth.createAccount.mockResolvedValue({ id: 'uid-ana' });
      await expect(service.createUser(data, 'analyst-1')).resolves.toEqual({
        id: 'uid-ana',
      });
    });

    it('e-mail já cadastrado: propaga o 409 e não grava perfil', async () => {
      auth.createAccount.mockRejectedValue(
        new ConflictException('Email já cadastrado.'),
      );
      await expect(
        service.createUser(data, 'analyst-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('falha ao gravar o perfil: desfaz a conta no Firebase (sem conta órfã)', async () => {
      auth.createAccount.mockResolvedValue({ id: 'uid-ana' });
      repo.create.mockRejectedValue(new Error('firestore fora'));

      await expect(service.createUser(data, 'analyst-1')).rejects.toThrow(
        'firestore fora',
      );
      expect(auth.removeAccount).toHaveBeenCalledWith('uid-ana');
    });
  });

  describe('visibilidade da listagem por role', () => {
    beforeEach(() => {
      repo.findAllWithRole.mockResolvedValue([
        userOf('Ana', 'analyst-1'),
        userOf('Bruna', 'analyst-2'),
        userOf('Carla', undefined), // legada, sem vínculo
      ]);
    });

    it('ANALYST vê apenas os usuários que cadastrou', async () => {
      const res = await service.findAllActiveUsers({
        orderBy: 'fullName',
        direction: 'asc',
        requesterId: 'analyst-1',
        requesterRoles: ['ANALYST'],
      });

      expect(res.items.map((u) => u.fullName)).toEqual(['Ana']);
      expect(res.total).toBe(1);
    });

    it('MANAGER vê apenas as que cadastrou (não a carteira do Analista)', async () => {
      const res = await service.findAllActiveUsers({
        orderBy: 'fullName',
        direction: 'asc',
        requesterId: 'manager-1',
        requesterRoles: ['MANAGER'],
      });

      expect(res.items).toEqual([]);
    });

    it('ADMIN é super-usuário e vê todas, inclusive as legadas sem vínculo', async () => {
      const res = await service.findAllActiveUsers({
        ...admin,
        orderBy: 'fullName',
        direction: 'asc',
      });

      expect(res.items.map((u) => u.fullName)).toEqual([
        'Ana',
        'Bruna',
        'Carla',
      ]);
    });

    it('resolve createdByName pelo perfil do criador', async () => {
      repo.findByIds.mockResolvedValue([
        new User({ fullName: 'Bia Analista' }, 'analyst-1', ['ANALYST']),
      ]);

      const res = await service.findAllActiveUsers({
        orderBy: 'fullName',
        direction: 'asc',
        requesterId: 'analyst-1',
        requesterRoles: ['ANALYST'],
      });

      expect(res.items[0].createdByName).toBe('Bia Analista');
    });

    it('sem perfil, cai para o e-mail do Firebase, em lote (caso do Manager)', async () => {
      repo.findAllWithRole.mockResolvedValue([
        userOf('Ana', 'manager-1'),
        userOf('Bia', 'manager-1'),
      ]);
      repo.findByIds.mockResolvedValue([]);
      auth.findEmailsByIds.mockResolvedValue(
        new Map([['manager-1', 'gestora@dna.com']]),
      );

      const res = await service.findAllActiveUsers({
        orderBy: 'fullName',
        direction: 'asc',
        requesterId: 'manager-1',
        requesterRoles: ['MANAGER'],
      });

      expect(auth.findEmailsByIds).toHaveBeenCalledTimes(1);
      expect(auth.findEmailsByIds).toHaveBeenCalledWith(['manager-1']);
      expect(res.items.map((i) => i.createdByName)).toEqual([
        'gestora@dna.com',
        'gestora@dna.com',
      ]);
    });

    it('criador que excluiu a conta (sem perfil nem login) → createdByName nulo', async () => {
      repo.findAllWithRole.mockResolvedValue([userOf('Ana', 'excluido-1')]);
      repo.findByIds.mockResolvedValue([]);
      auth.findEmailsByIds.mockResolvedValue(new Map());

      const res = await service.findAllActiveUsers({
        orderBy: 'fullName',
        direction: 'asc',
        ...admin,
      });

      expect(res.items[0].createdByName).toBeNull();
    });
  });

  describe('posse nas rotas de gestão', () => {
    it('ANALYST não edita usuário de outro analista (403)', async () => {
      repo.findById.mockResolvedValue(userOf('Bruna', 'analyst-2'));

      await expect(
        service.update(
          'Bruna',
          { fullName: 'Hackeada' },
          { id: 'analyst-1', roles: ['ANALYST'] },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('ANALYST não desativa usuário de outro analista (403)', async () => {
      repo.findById.mockResolvedValue(userOf('Bruna', 'analyst-2'));

      await expect(
        service.disable('Bruna', { id: 'analyst-1', roles: ['ANALYST'] }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('ANALYST gerencia o próprio usuário', async () => {
      const owned = userOf('Ana', 'analyst-1');
      repo.findById.mockResolvedValue(owned);

      await service.disable('Ana', { id: 'analyst-1', roles: ['ANALYST'] });

      expect(owned.isActive).toBe(false);
    });

    it('ADMIN gerencia qualquer usuário', async () => {
      const owned = userOf('Bruna', 'analyst-2');
      repo.findById.mockResolvedValue(owned);

      await service.disable('Bruna', { id: 'admin-1', roles: ['ADMIN'] });

      expect(owned.isActive).toBe(false);
    });
  });

  describe('reactivate', () => {
    it('reativa e persiste', async () => {
      const u = makeUser('Ana', false);
      repo.findById.mockResolvedValue(u);
      const res = await service.reactivate('Ana');
      expect(u.isActive).toBe(true);
      expect(repo.update).toHaveBeenCalledWith('Ana', u);
      expect(res.isActive).toBe(true);
    });

    it('404 quando não existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.reactivate('x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('aplica os campos informados e persiste', async () => {
      const u = makeUser('Ana');
      repo.findById.mockResolvedValue(u);
      await service.update('Ana', { fullName: 'Ana Maria' });
      expect(u.fullName).toBe('Ana Maria');
      expect(repo.update).toHaveBeenCalledWith('Ana', u);
    });

    it('não altera campos ausentes no payload', async () => {
      const u = makeUser('Ana');
      repo.findById.mockResolvedValue(u);
      await service.update('Ana', { birthPlace: 'Curitiba-PR' });
      expect(u.fullName).toBe('Ana');
      expect(u.birthPlace).toBe('Curitiba-PR');
    });

    it('404 quando não existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.update('x', { fullName: 'y' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('status do acesso no detalhe (spec 010)', () => {
    it('o detalhe traz o e-mail e o status do acesso lidos do Firebase', async () => {
      repo.findById.mockResolvedValue(userOf('Ana', 'analyst-1'));
      auth.findAccount.mockResolvedValue({
        email: 'ana@dna.com',
        accessStatus: 'invite_pending',
      });

      const view = await service.findOneView('Ana', {
        id: 'analyst-1',
        roles: ['ANALYST'],
      });

      expect(auth.findAccount).toHaveBeenCalledWith('Ana');
      expect(view.email).toBe('ana@dna.com');
      expect(view.accessStatus).toBe('invite_pending');
      expect(view).not.toHaveProperty('tempPassword');
      expect(view).not.toHaveProperty('mustChangePassword');
    });

    it('sem conta no Firebase: status nulo e e-mail da cópia do perfil', async () => {
      const ana = userOf('Ana', 'analyst-1');
      ana.email = 'copia@dna.com';
      repo.findById.mockResolvedValue(ana);
      auth.findAccount.mockResolvedValue(null);

      const view = await service.findOneView('Ana', {
        id: 'analyst-1',
        roles: ['ANALYST'],
      });

      expect(view.email).toBe('copia@dna.com');
      expect(view.accessStatus).toBeNull();
    });

    it('a listagem não consulta o Firebase conta a conta', async () => {
      repo.findAllWithRole.mockResolvedValue([userOf('Ana', 'admin-1')]);

      await service.findAllActiveUsers({
        orderBy: 'fullName',
        direction: 'asc',
        ...admin,
      });

      expect(auth.findAccount).not.toHaveBeenCalled();
    });
  });

  describe('findMe (sincronia do e-mail, spec 010)', () => {
    const own = () => {
      const u = userOf('Ana', 'analyst-1');
      u.email = 'velho@dna.com';
      return u;
    };

    it('o e-mail do token mudou (troca confirmada): atualiza a cópia no perfil', async () => {
      repo.findById.mockResolvedValue(own());

      const me = await service.findMe('Ana', ['USER'], 'Ana', 'novo@dna.com');

      expect(me.email).toBe('novo@dna.com');
      expect(repo.update).toHaveBeenCalledWith(
        'Ana',
        expect.objectContaining({ email: 'novo@dna.com' }),
      );
    });

    it('mesmo e-mail: não grava nada', async () => {
      repo.findById.mockResolvedValue(own());
      await service.findMe('Ana', ['USER'], 'Ana', 'velho@dna.com');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('ADMIN lendo o perfil de outro: não sincroniza com o e-mail dele', async () => {
      repo.findById.mockResolvedValue(own());
      await service.findMe('admin-1', ['ADMIN'], 'Ana', 'admin@dna.com');
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
