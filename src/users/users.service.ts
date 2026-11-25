import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserStatusFilter } from './dto/list-users-query.dto';
import { UsersRepository } from './users.repository';
import { User } from './entities/user.entity';
import { AccessStatus, AuthService } from '../auth/auth.service';
import { Roles } from '../enums/role.enum';
import { applyListQuery, assertDirection } from '../common/list-query';

/**
 * Usuário como sai na resposta: os dados do documento + o nome de quem o
 * cadastrou. É a forma plana da entidade (sem os métodos), porque
 * `createdByName` é derivado e não pode ser persistido junto.
 */
export type UserView = Omit<
  User,
  'disable' | 'enable' | 'applyUpdate' | 'toUserDataPrompt'
> & { createdByName: string | null };

/**
 * Detalhe do usuário: a view da listagem + e-mail e status do acesso, lidos do
 * Firebase Auth (spec 010). Só no detalhe: a listagem não consulta o Firebase
 * conta a conta.
 */
export type UserDetailView = Omit<UserView, 'email'> & {
  /** Vem do Firebase Auth (fonte de verdade), não da cópia no perfil. */
  email: string | null;
  /** `null` quando o perfil não tem conta no Firebase. */
  accessStatus: AccessStatus | null;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly auth: AuthService,
  ) {}

  /**
   * Cria o usuário por convite e o vincula a quem o cadastrou (`createdBy` = id
   * do token), seja ele Analista ou Manager. Esse vínculo é o que governa a
   * visibilidade na listagem (findAllActiveUsers).
   *
   * A conta nasce no Firebase sem senha (ver `AuthService.createAccount`); se o
   * perfil não puder ser gravado, a conta é desfeita para não sobrar um login
   * sem perfil.
   */
  async createUser(
    data: CreateUserDto,
    creatorId: string,
  ): Promise<{ id: string }> {
    // As roles moram na custom claim do Firebase (fonte de verdade da
    // autorização) e são copiadas em `users.roles` para listagem/filtro.
    // Qualquer futura mutação de role deve atualizar os dois.
    const roles = [Roles.USER];
    const { id } = await this.auth.createAccount(data.email, roles);
    const profile = new User({ ...data, createdBy: creatorId }, id, roles);
    try {
      await this.repository.create(profile);
    } catch (e) {
      await this.auth.removeAccount(id);
      throw e;
    }
    return { id };
  }

  /**
   * Listagem paginada de usuários (role USER). Busca os candidatos no
   * repositório e aplica visibilidade, filtro de status, ordenação e paginação
   * em memória (volume esperado é pequeno; evita índice composto no Firestore).
   */
  async findAllActiveUsers(options: {
    orderBy: string;
    direction: string;
    page?: number;
    pageSize?: number;
    name?: string;
    status?: UserStatusFilter;
    requesterId: string;
    requesterRoles: string[];
  }) {
    const { requesterId, requesterRoles } = options;
    assertDirection(options.direction);

    const all = await this.repository.findAllWithRole(Roles.USER);
    const visible = all.filter((user) =>
      this.isVisibleTo(user, requesterId, requesterRoles),
    );
    const { items, total, page, pageSize } = applyListQuery(visible, options);

    return {
      items: await this.withCreatorNames(items),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Visibilidade por role: Analista e Manager enxergam apenas os usuários que
   * eles próprios cadastraram (`createdBy`); ADMIN é super-usuário e vê todas
   * — inclusive as anteriores ao vínculo, que não têm `createdBy`.
   */
  private isVisibleTo(
    user: User,
    requesterId: string,
    requesterRoles: string[],
  ): boolean {
    if (requesterRoles?.includes(Roles.ADMIN)) {
      return true;
    }
    return user.createdBy === requesterId;
  }

  /**
   * Enriquece os usuários com o nome de quem os cadastrou. Resolve em lote (uma
   * busca por criador distinto, não por item) no perfil de `users`; quando o
   * criador não tem perfil — caso do Manager — cai para o e-mail de acesso no
   * Firebase Auth (uma chamada em lote). Criador que excluiu a conta fica `null`. `createdByName` é transiente: sai na resposta, mas
   * nunca é persistido (o retorno é objeto plano, não a entidade).
   */
  private async withCreatorNames(users: User[]): Promise<UserView[]> {
    const creatorIds = [
      ...new Set(
        users
          .map((user) => user.createdBy)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const nameById = new Map<string, string>();

    const profiles = await this.repository.findByIds(creatorIds);
    for (const profile of profiles) {
      nameById.set(profile.id, profile.fullName);
    }

    const withoutProfile = creatorIds.filter((id) => !nameById.has(id));
    const emails = await this.auth.findEmailsByIds(withoutProfile);
    for (const [id, email] of emails) {
      nameById.set(id, email);
    }

    return users.map((user) => ({
      ...user,
      createdByName: user.createdBy
        ? (nameById.get(user.createdBy) ?? null)
        : null,
    }));
  }

  /** Entidade completa (com os métodos de domínio). Consumida internamente. */
  async findOne(
    id: string,
    requester?: { id: string; roles: string[] },
  ): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(
        `User with ID ${id} not found in users collection.`,
      );
    }
    if (requester) {
      this.assertCanManage(user, requester);
    }
    return user;
  }

  /** Detalhe do usuário para resposta HTTP: criador + e-mail e status do acesso. */
  async findOneView(
    id: string,
    requester: { id: string; roles: string[] },
  ): Promise<UserDetailView> {
    const user = await this.findOne(id, requester);
    const [view] = await this.withCreatorNames([user]);
    const account = await this.auth.findAccount(id);
    return {
      ...view,
      email: account?.email ?? user.email ?? null,
      accessStatus: account?.accessStatus ?? null,
    };
  }

  /**
   * Posse: Analista e Manager só operam sobre os usuários que cadastraram;
   * ADMIN é super-usuário. Sem isso, a role sozinha permitiria editar/desativar
   * o usuário de outro pelo id — o filtro da listagem não protege o acesso
   * direto ao recurso.
   */
  private assertCanManage(
    user: User,
    requester: { id: string; roles: string[] },
  ): void {
    if (this.isVisibleTo(user, requester.id, requester.roles)) {
      return;
    }
    throw new ForbiddenException(
      'Você só pode gerenciar os usuários que cadastrou.',
    );
  }

  /**
   * Perfil do próprio usuário (ou de qualquer um, para ADMIN/MANAGER).
   *
   * `users.email` é cópia do e-mail do Firebase. Quando a pessoa troca o e-mail
   * em Meu Perfil, o Firebase só o altera depois do clique no link; no acesso
   * seguinte o token já traz o novo endereço e a cópia é atualizada aqui
   * (sincronia preguiçosa, sem endpoint próprio). Só vale para o próprio perfil.
   */
  async findMe(
    idFromToken: string,
    rolesFromToken: string[],
    idFromUrl: string,
    emailFromToken?: string,
  ) {
    const isPrivileged =
      rolesFromToken?.some(
        (role) => role === Roles.ADMIN || role === Roles.MANAGER,
      ) ?? false;
    if (idFromToken !== idFromUrl && !isPrivileged) {
      throw new UnauthorizedException(
        'Impossível consultar dados de outro usuário.',
      );
    }
    const user = await this.repository.findById(idFromUrl);
    if (!user) {
      throw new NotFoundException(
        `Usuário com ID ${idFromUrl} não encontrado.`,
      );
    }
    const isOwnProfile = idFromToken === idFromUrl;
    if (isOwnProfile && emailFromToken && user.email !== emailFromToken) {
      user.email = emailFromToken;
      await this.repository.update(user.id, user);
    }
    return user;
  }

  async disable(id: string, requester?: { id: string; roles: string[] }) {
    const user = await this.loadManageable(id, requester);
    user.disable();
    return await this.repository.update(id, user);
  }

  async reactivate(id: string, requester?: { id: string; roles: string[] }) {
    const user = await this.loadManageable(id, requester);
    user.enable();
    return await this.repository.update(id, user);
  }

  async update(
    id: string,
    data: UpdateUserDto,
    requester?: { id: string; roles: string[] },
  ) {
    const user = await this.loadManageable(id, requester);
    user.applyUpdate(data);
    return await this.repository.update(id, user);
  }

  /** Carrega o usuário garantindo existência (404) e posse do requisitante (403). */
  private async loadManageable(
    id: string,
    requester?: { id: string; roles: string[] },
  ): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuário com o ID ${id} não encontrado`);
    }
    if (requester) {
      this.assertCanManage(user, requester);
    }
    return user;
  }
}
