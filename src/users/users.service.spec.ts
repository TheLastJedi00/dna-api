import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

/** Maestra cadastrada por `createdBy` — o vínculo que governa a visibilidade. */
function maestraOf(fullName: string, createdBy?: string): User {
  const maestra = new User(
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
  return maestra;
}

/**
 * Cobre a lógica nova do CRUD de Maestras: listagem paginada com busca por nome
 * e filtro de status, reativação e edição. Repositório e auth mockados.
 */
function makeUser(fullName: string, isActive = true, id = fullName): User {
  const u = new User(
    {
      fullName,
      birthDate: '2000-01-01',
      birthTime: '00:00',
      birthPlace: 'Floripa-SC',
    } as any,
    id,
    ['USER'],
  );
  u.isActive = isActive;
  return u;
}

/** Requisitante ADMIN: super-usuário, enxerga e gerencia todas as Maestras. */
const admin = { requesterId: 'admin-1', requesterRoles: ['ADMIN'] };

describe('UsersService — CRUD de Maestras', () => {
  let service: UsersService;
  let repo: {
    findAllWithRole: jest.Mock;
    findById: jest.Mock;
    findByIds: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  let auth: {
    create: jest.Mock;
    findEmailById: jest.Mock;
    setTempPassword: jest.Mock;
    findCredentialsById: jest.Mock;
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
      create: jest.fn(),
      findEmailById: jest.fn().mockResolvedValue(null),
      setTempPassword: jest.fn().mockResolvedValue(undefined),
      findCredentialsById: jest.fn().mockResolvedValue(null),
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

  describe('createMaestra (vínculo com o criador)', () => {
    it('grava createdBy com o id de quem cadastrou, não do corpo', async () => {
      auth.create.mockResolvedValue({ id: 'maestra-1' });

      await service.createMaestra(
        {
          fullName: 'Ana',
          birthDate: '2000-01-01',
          birthTime: '00:00',
          birthPlace: 'Floripa-SC',
          login: { email: 'ana@dna.com', password: 'x' },
        } as any,
        'analyst-1',
      );

      const persisted = repo.create.mock.calls[0][0] as User;
      expect(persisted.createdBy).toBe('analyst-1');
      expect(persisted.roles).toEqual(['USER']);
    });
  });

  describe('visibilidade da listagem por role', () => {
    beforeEach(() => {
      repo.findAllWithRole.mockResolvedValue([
        maestraOf('Ana', 'analyst-1'),
        maestraOf('Bruna', 'analyst-2'),
        maestraOf('Carla', undefined), // legada, sem vínculo
      ]);
    });

    it('ANALYST vê apenas as Maestras que cadastrou', async () => {
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

    it('sem perfil, cai para o e-mail do auth (caso do Manager)', async () => {
      repo.findAllWithRole.mockResolvedValue([maestraOf('Ana', 'manager-1')]);
      repo.findByIds.mockResolvedValue([]);
      auth.findEmailById.mockResolvedValue('gestora@dna.com');

      const res = await service.findAllActiveUsers({
        orderBy: 'fullName',
        direction: 'asc',
        requesterId: 'manager-1',
        requesterRoles: ['MANAGER'],
      });

      expect(res.items[0].createdByName).toBe('gestora@dna.com');
    });
  });

  describe('posse nas rotas de gestão', () => {
    it('ANALYST não edita Maestra de outro analista (403)', async () => {
      repo.findById.mockResolvedValue(maestraOf('Bruna', 'analyst-2'));

      await expect(
        service.update(
          'Bruna',
          { fullName: 'Hackeada' },
          { id: 'analyst-1', roles: ['ANALYST'] },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('ANALYST não desativa Maestra de outro analista (403)', async () => {
      repo.findById.mockResolvedValue(maestraOf('Bruna', 'analyst-2'));

      await expect(
        service.disable('Bruna', { id: 'analyst-1', roles: ['ANALYST'] }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('ANALYST gerencia a própria Maestra', async () => {
      const maestra = maestraOf('Ana', 'analyst-1');
      repo.findById.mockResolvedValue(maestra);

      await service.disable('Ana', { id: 'analyst-1', roles: ['ANALYST'] });

      expect(maestra.isActive).toBe(false);
    });

    it('ADMIN gerencia qualquer Maestra', async () => {
      const maestra = maestraOf('Bruna', 'analyst-2');
      repo.findById.mockResolvedValue(maestra);

      await service.disable('Bruna', { id: 'admin-1', roles: ['ADMIN'] });

      expect(maestra.isActive).toBe(false);
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

  describe('senha temporária (spec 005)', () => {
    it('o detalhe traz e-mail e o estado da senha, lidos do auth', async () => {
      repo.findById.mockResolvedValue(maestraOf('Ana', 'analyst-1'));
      auth.findCredentialsById.mockResolvedValue({
        email: 'ana@dna.com',
        mustChangePassword: true,
        tempPassword: 'provisoria',
      });

      const view = await service.findOneView('Ana', {
        id: 'analyst-1',
        roles: ['ANALYST'],
      });

      expect(view.email).toBe('ana@dna.com');
      expect(view.mustChangePassword).toBe(true);
      expect(view.tempPassword).toBe('provisoria');
    });

    it('a listagem NÃO carrega a senha em texto plano', async () => {
      repo.findAllWithRole.mockResolvedValue([maestraOf('Ana', 'admin-1')]);
      repo.findByIds.mockResolvedValue([]);

      const { items } = await service.findAllActiveUsers({
        orderBy: 'fullName',
        direction: 'asc',
        ...admin,
      });

      // A senha provisória é credencial em claro: só pode existir no detalhe.
      expect(items[0]).not.toHaveProperty('tempPassword');
      expect(auth.findCredentialsById).not.toHaveBeenCalled();
    });

    it('ANALYST redefine a senha da própria Maestra', async () => {
      repo.findById.mockResolvedValue(maestraOf('Ana', 'analyst-1'));

      await service.setTempPassword('Ana', 'nova123', {
        id: 'analyst-1',
        roles: ['ANALYST'],
      });

      expect(auth.setTempPassword).toHaveBeenCalledWith('Ana', 'nova123');
    });

    it('ANALYST não redefine a senha da Maestra de outro (403)', async () => {
      repo.findById.mockResolvedValue(maestraOf('Bruna', 'analyst-2'));

      await expect(
        service.setTempPassword('Bruna', 'invadida', {
          id: 'analyst-1',
          roles: ['ANALYST'],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(auth.setTempPassword).not.toHaveBeenCalled();
    });
  });
});
