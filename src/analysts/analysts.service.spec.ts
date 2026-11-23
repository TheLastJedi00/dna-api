import { NotFoundException } from '@nestjs/common';
import { AnalystsService } from './analysts.service';
import { User } from '../users/entities/user.entity';
import { Roles } from '../enums/role.enum';

/**
 * Cobre o CRUD de Analistas e, principalmente, as duas regras que protegem
 * dados: /analysts/:id não pode alcançar uma Maestra, e a supervisão devolve
 * apenas nome e status da carteira.
 */
function makeAnalyst(fullName: string, isActive = true, id = fullName): User {
  const analyst = new User({ fullName }, id, [Roles.ANALYST]);
  analyst.isActive = isActive;
  return analyst;
}

function makeMaestra(fullName: string, createdBy?: string, isActive = true) {
  const maestra = new User(
    {
      fullName,
      birthDate: '2000-01-01',
      birthTime: '00:00',
      birthPlace: 'Floripa-SC',
      createdBy,
    },
    fullName,
    [Roles.USER],
  );
  maestra.isActive = isActive;
  return maestra;
}

describe('AnalystsService', () => {
  let service: AnalystsService;
  let repo: {
    findAllWithRole: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  let auth: {
    createAccount: jest.Mock;
    removeAccount: jest.Mock;
    findAccount: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      findAllWithRole: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      update: jest.fn().mockImplementation((_id, u) => Promise.resolve(u)),
      create: jest.fn(),
    };
    auth = {
      createAccount: jest.fn().mockResolvedValue({ id: 'uid-bia' }),
      removeAccount: jest.fn().mockResolvedValue(undefined),
      findAccount: jest.fn().mockResolvedValue(null),
    };
    service = new AnalystsService(repo as any, auth as any);
  });

  describe('create (convite: conta no Firebase sem senha)', () => {
    it('cria a conta com a role ANALYST e persiste o perfil com o uid', async () => {
      await expect(
        service.create({ fullName: 'Bia', email: 'bia@dna.com' }),
      ).resolves.toMatchObject({ id: 'uid-bia' });

      expect(auth.createAccount).toHaveBeenCalledWith('bia@dna.com', [
        Roles.ANALYST,
      ]);
      const persisted = repo.create.mock.calls[0][0] as User;
      expect(persisted.id).toBe('uid-bia');
      expect(persisted.roles).toEqual([Roles.ANALYST]);
      expect(persisted.email).toBe('bia@dna.com');
      expect(persisted.isActive).toBe(true);
      expect(persisted.birthDate).toBeUndefined();
    });

    it('falha ao gravar o perfil: desfaz a conta no Firebase', async () => {
      repo.create.mockRejectedValue(new Error('firestore fora'));
      await expect(
        service.create({ fullName: 'Bia', email: 'bia@dna.com' }),
      ).rejects.toThrow('firestore fora');
      expect(auth.removeAccount).toHaveBeenCalledWith('uid-bia');
    });
  });

  describe('findAll', () => {
    it('lista só analistas, com busca por nome e paginação', async () => {
      repo.findAllWithRole.mockResolvedValue([
        makeAnalyst('Ana'),
        makeAnalyst('Bia'),
        makeAnalyst('Carla'),
      ]);

      const res = await service.findAll({
        orderBy: 'fullName',
        direction: 'asc',
        page: 1,
        pageSize: 2,
      });

      expect(repo.findAllWithRole).toHaveBeenCalledWith(Roles.ANALYST);
      expect(res.total).toBe(3);
      expect(res.items.map((a) => a.fullName)).toEqual(['Ana', 'Bia']);
    });

    it('status=inactive traz só os desativados', async () => {
      repo.findAllWithRole.mockResolvedValue([
        makeAnalyst('Ana', true),
        makeAnalyst('Bia', false),
      ]);

      const res = await service.findAll({
        orderBy: 'fullName',
        direction: 'asc',
        status: 'inactive',
      });

      expect(res.items.map((a) => a.fullName)).toEqual(['Bia']);
    });
  });

  describe('findOne', () => {
    it('404 quando o documento existe mas não é um Analista (é uma Maestra)', async () => {
      repo.findById.mockResolvedValue(makeMaestra('Cliente'));

      await expect(service.findOne('Cliente')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('404 quando não existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne('x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update / disable / reactivate', () => {
    it('edita o nome e persiste', async () => {
      const analyst = makeAnalyst('Bia');
      repo.findById.mockResolvedValue(analyst);

      await service.update('Bia', { fullName: 'Bia Souza' });

      expect(analyst.fullName).toBe('Bia Souza');
      expect(repo.update).toHaveBeenCalledWith('Bia', analyst);
    });

    it('desativa e reativa (soft delete)', async () => {
      const analyst = makeAnalyst('Bia');
      repo.findById.mockResolvedValue(analyst);

      await service.disable('Bia');
      expect(analyst.isActive).toBe(false);

      await service.reactivate('Bia');
      expect(analyst.isActive).toBe(true);
    });

    it('não desativa uma Maestra pela rota de Analista', async () => {
      repo.findById.mockResolvedValue(makeMaestra('Cliente'));
      await expect(service.disable('Cliente')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('findLinkedMaestras (supervisão)', () => {
    beforeEach(() => {
      repo.findById.mockResolvedValue(makeAnalyst('Bia', true, 'analyst-1'));
      repo.findAllWithRole.mockImplementation((role: string) =>
        Promise.resolve(
          role === Roles.USER
            ? [
                makeMaestra('Carla', 'analyst-1'),
                makeMaestra('Ana', 'analyst-1', false),
                makeMaestra('Duda', 'analyst-2'),
                makeMaestra('Eva', undefined),
              ]
            : [],
        ),
      );
    });

    it('devolve só as Maestras do analista, ordenadas por nome', async () => {
      const linked = await service.findLinkedMaestras('analyst-1');

      expect(linked.map((m) => m.fullName)).toEqual(['Ana', 'Carla']);
    });

    it('expõe apenas nome e status — nunca dados pessoais nem id', async () => {
      const linked = await service.findLinkedMaestras('analyst-1');

      expect(Object.keys(linked[0]).sort()).toEqual(['fullName', 'isActive']);
      expect(linked[0]).toEqual({ fullName: 'Ana', isActive: false });
    });

    it('404 quando o analista não existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.findLinkedMaestras('fantasma'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('status do acesso no detalhe (spec 010)', () => {
    it('o detalhe traz o e-mail e o status do acesso lidos do Firebase', async () => {
      repo.findById.mockResolvedValue(makeAnalyst('Ana', true, 'a1'));
      auth.findAccount.mockResolvedValue({
        email: 'ana@dna.com',
        accessStatus: 'active',
      });

      const view = await service.findOneView('a1');

      expect(view.email).toBe('ana@dna.com');
      expect(view.accessStatus).toBe('active');
      expect(view).not.toHaveProperty('tempPassword');
    });

    it('a listagem não consulta o Firebase', async () => {
      repo.findAllWithRole.mockResolvedValue([makeAnalyst('Ana')]);

      await service.findAll({ orderBy: 'fullName', direction: 'asc' });

      expect(auth.findAccount).not.toHaveBeenCalled();
    });
  });
});
