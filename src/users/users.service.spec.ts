import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

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
  let auth: { create: jest.Mock; findEmailById: jest.Mock };

  beforeEach(() => {
    repo = {
      findAllWithRole: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((_id, u) => Promise.resolve(u)),
      create: jest.fn(),
    };
    auth = { create: jest.fn(), findEmailById: jest.fn().mockResolvedValue(null) };
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
});
