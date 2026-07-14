import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { AuthService } from '../auth/auth.service';
import { User } from '../users/entities/user.entity';
import { Roles } from '../enums/role.enum';
import { applyListQuery, assertDirection, ListQuery } from '../common/list-query';
import { CreateAnalystDto } from './dto/create-analyst.dto';
import { UpdateAnalystDto } from './dto/update-analyst.dto';

/**
 * Maestra vinculada, como o Manager a enxerga na supervisão: só nome e status.
 * Sem id, sem dados natais — o Manager supervisiona a carteira do Analista, mas
 * não acessa os dados pessoais da cliente (regra de privacidade da spec 004).
 */
export interface LinkedMaestra {
  fullName: string;
  isActive: boolean;
}

/** Detalhe do Analista: o perfil + as credenciais (spec 005). */
export type AnalystDetailView = Omit<
  User,
  'disable' | 'enable' | 'applyUpdate' | 'toUserDataPrompt' | 'email'
> & {
  /** Vem da coleção `auth` (fonte de verdade), não da cópia no perfil. */
  email: string | null;
  mustChangePassword: boolean;
  tempPassword: string | null;
};

/**
 * Analistas são perfis da coleção `users` com `roles: ['ANALYST']` — mesmo
 * padrão da Maestra (doc chaveado pelo id do `auth`). Por isso este serviço
 * reusa o UsersRepository em vez de abrir um segundo acesso à mesma coleção.
 */
@Injectable()
export class AnalystsService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly auth: AuthService,
  ) {}

  async create(data: CreateAnalystDto) {
    const roles = [Roles.ANALYST];
    const analystAuth = await this.auth.create(data.login, roles);
    const analyst = new User(
      { fullName: data.fullName, email: data.login.email },
      analystAuth.id,
      roles,
    );
    await this.repository.create(analyst);
    return analyst;
  }

  async findAll(query: ListQuery) {
    assertDirection(query.direction);
    const all = await this.repository.findAllWithRole(Roles.ANALYST);
    return applyListQuery(all, query);
  }

  async findOne(id: string): Promise<User> {
    const analyst = await this.repository.findById(id);
    // Um doc de Maestra não pode ser alcançado por /analysts/:id: sem esta
    // checagem, a rota viraria um atalho para os dados da cliente.
    if (!analyst || !analyst.roles?.includes(Roles.ANALYST)) {
      throw new NotFoundException(`Analista com o ID ${id} não encontrado`);
    }
    return analyst;
  }

  /**
   * Detalhe do Analista com as credenciais (e-mail e estado da senha
   * provisória). Como no caso da Maestra, o `tempPassword` só sai aqui — nunca
   * na listagem.
   */
  async findOneView(id: string): Promise<AnalystDetailView> {
    const analyst = await this.findOne(id);
    const credentials = await this.auth.findCredentialsById(id);
    return {
      ...analyst,
      email: credentials?.email ?? analyst.email ?? null,
      mustChangePassword: credentials?.mustChangePassword ?? false,
      tempPassword: credentials?.tempPassword ?? null,
    };
  }

  /** Redefinição da senha do Analista pelo painel (ADMIN/MANAGER). */
  async setTempPassword(id: string, password: string): Promise<void> {
    await this.findOne(id);
    await this.auth.setTempPassword(id, password);
  }

  async update(id: string, data: UpdateAnalystDto) {
    const analyst = await this.findOne(id);
    analyst.applyUpdate(data);
    return await this.repository.update(id, analyst);
  }

  async disable(id: string) {
    const analyst = await this.findOne(id);
    analyst.disable();
    return await this.repository.update(id, analyst);
  }

  async reactivate(id: string) {
    const analyst = await this.findOne(id);
    analyst.enable();
    return await this.repository.update(id, analyst);
  }

  /**
   * Supervisão: as Maestras cadastradas por este Analista, em DTO reduzido.
   * 404 se o analista não existe (evita devolver lista vazia para id inválido).
   */
  async findLinkedMaestras(analystId: string): Promise<LinkedMaestra[]> {
    await this.findOne(analystId);
    const maestras = await this.repository.findAllWithRole(Roles.USER);
    return maestras
      .filter((maestra) => maestra.createdBy === analystId)
      .map((maestra) => ({
        fullName: maestra.fullName,
        isActive: maestra.isActive,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
}
