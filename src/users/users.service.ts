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
import { AuthService } from '../auth/auth.service';
import { isTempPasswordExpired } from '../auth/entities/auth.entity';
import { Roles } from '../enums/role.enum';
import { applyListQuery, assertDirection } from '../common/list-query';

/**
 * Maestra como sai na resposta: os dados do documento + o nome de quem a
 * cadastrou. É a forma plana da entidade (sem os métodos), porque
 * `createdByName` é derivado e não pode ser persistido junto.
 */
export type MaestraView = Omit<
  User,
  'disable' | 'enable' | 'applyUpdate' | 'toUserDataPrompt'
> & { createdByName: string | null };

/**
 * Detalhe da Maestra: a view da listagem + as credenciais (spec 005). O
 * `tempPassword` é senha em texto plano — por isso só existe aqui, no detalhe de
 * quem tem posse da Maestra, e nunca na listagem.
 */
export type MaestraDetailView = Omit<MaestraView, 'email'> & {
  /** Vem da coleção `auth` (fonte de verdade), não da cópia no perfil. */
  email: string | null;
  mustChangePassword: boolean;
  tempPassword: string | null;
  /** Até quando a senha provisória vale (ISO 8601); `null` se não há uma. */
  tempPasswordExpiresAt: string | null;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly auth: AuthService,
  ) {}

  /**
   * Cria a Maestra e a vincula a quem a cadastrou (`createdBy` = id do token),
   * seja ele Analista ou Manager. Esse vínculo é o que governa a visibilidade
   * na listagem (findAllActiveUsers).
   */
  async createMaestra(data: CreateUserDto, creatorId: string) {
    // Fonte de verdade de autorização = documento `auth` (as roles do JWT saem
    // dele). `users.roles` é uma cópia denormalizada usada só para
    // listagem/filtro (findAllActiveUsers) e é gravada atomicamente aqui com o
    // mesmo valor. Qualquer futura mutação de role deve atualizar os dois.
    const roles = [Roles.USER];
    const userAuth = await this.auth.create(data.login, roles);
    const object = new User(
      { ...data, createdBy: creatorId, email: data.login?.email },
      userAuth.id,
      roles,
    );
    await this.repository.create(object);
  }

  /**
   * Listagem paginada de Maestras (role USER). Busca os candidatos no
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
   * Visibilidade por role: Analista e Manager enxergam apenas as Maestras que
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
   * Enriquece as Maestras com o nome de quem as cadastrou. Resolve em lote (uma
   * busca por criador distinto, não por item) no perfil de `users`; quando o
   * criador não tem perfil — caso do Manager, que só existe em `auth` — cai
   * para o e-mail de acesso. `createdByName` é transiente: sai na resposta, mas
   * nunca é persistido (o retorno é objeto plano, não a entidade).
   */
  private async withCreatorNames(users: User[]): Promise<MaestraView[]> {
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
    await Promise.all(
      withoutProfile.map(async (id) => {
        const email = await this.auth.findEmailById(id);
        if (email) {
          nameById.set(id, email);
        }
      }),
    );

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

  /**
   * Detalhe da Maestra para resposta HTTP: quem a cadastrou + as credenciais
   * (e-mail e o estado da senha provisória), lidas da coleção `auth`.
   */
  async findOneView(
    id: string,
    requester: { id: string; roles: string[] },
  ): Promise<MaestraDetailView> {
    const user = await this.findOne(id, requester);
    const [view] = await this.withCreatorNames([user]);
    const credentials = await this.auth.findCredentialsById(id);
    // Senha vencida não é senha: some da tela do gestor, e o botão de gerar
    // outra volta a aparecer.
    const expired = credentials ? isTempPasswordExpired(credentials) : false;
    return {
      ...view,
      email: credentials?.email ?? user.email ?? null,
      mustChangePassword: credentials?.mustChangePassword ?? false,
      tempPassword: expired ? null : (credentials?.tempPassword ?? null),
      tempPasswordExpiresAt: expired
        ? null
        : (credentials?.tempPasswordExpiresAt ?? null),
    };
  }

  /**
   * Redefinição da senha da Maestra pelo painel. A posse é validada antes: um
   * Analista não pode redefinir a senha da Maestra de outro.
   */
  async setTempPassword(
    id: string,
    password: string,
    requester: { id: string; roles: string[] },
  ): Promise<void> {
    await this.loadManageable(id, requester);
    await this.auth.setTempPassword(id, password);
  }

  /**
   * Posse: Analista e Manager só operam sobre as Maestras que cadastraram;
   * ADMIN é super-usuário. Sem isso, a role sozinha permitiria editar/desativar
   * a Maestra de outro pelo id — o filtro da listagem não protege o acesso
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
      'Você só pode gerenciar as Maestras que cadastrou.',
    );
  }

  async findMe(
    idFromToken: string,
    rolesFromToken: string[],
    idFromUrl: string,
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

  /** Carrega a Maestra garantindo existência (404) e posse do requisitante (403). */
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
