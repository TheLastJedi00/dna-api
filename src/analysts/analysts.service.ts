import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { AccessStatus, AuthService } from '../auth/auth.service';
import { User } from '../users/entities/user.entity';
import { Roles } from '../enums/role.enum';
import {
  applyListQuery,
  assertDirection,
  ListQuery,
} from '../common/list-query';
import { CreateAnalystDto } from './dto/create-analyst.dto';
import { UpdateAnalystDto } from './dto/update-analyst.dto';

/**
 * Usuário vinculado, como o Manager o enxerga na supervisão: só nome e status.
 * Sem id, sem dados natais — o Manager supervisiona a carteira do Analista, mas
 * não acessa os dados pessoais da cliente (regra de privacidade da spec 004).
 */
export interface LinkedUser {
  fullName: string;
  isActive: boolean;
}

/** Detalhe do Analista: o perfil + e-mail e status do acesso (spec 010). */
export type AnalystDetailView = Omit<
  User,
  'disable' | 'enable' | 'applyUpdate' | 'toUserDataPrompt' | 'email'
> & {
  /** Vem do Firebase Auth (fonte de verdade), não da cópia no perfil. */
  email: string | null;
  /** `null` quando o perfil não tem conta no Firebase. */
  accessStatus: AccessStatus | null;
};

/**
 * Analistas são perfis da coleção `users` com `roles: ['ANALYST']` — mesmo
 * padrão dos usuários (doc chaveado pelo uid do Firebase Auth). Por isso este serviço
 * reusa o UsersRepository em vez de abrir um segundo acesso à mesma coleção.
 */
@Injectable()
export class AnalystsService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly auth: AuthService,
  ) {}

  /**
   * Cadastro por convite (spec 010): conta no Firebase sem senha + perfil em
   * `users`. Se o perfil falhar, a conta é desfeita (mesma regra do usuário).
   */
  async create(data: CreateAnalystDto) {
    const roles = [Roles.ANALYST];
    const { id } = await this.auth.createAccount(data.email, roles);
    const analyst = new User(
      { fullName: data.fullName, email: data.email },
      id,
      roles,
    );
    try {
      await this.repository.create(analyst);
    } catch (e) {
      await this.auth.removeAccount(id);
      throw e;
    }
    return analyst;
  }

  async findAll(query: ListQuery) {
    assertDirection(query.direction);
    const all = await this.repository.findAllWithRole(Roles.ANALYST);
    return applyListQuery(all, query);
  }

  async findOne(id: string): Promise<User> {
    const analyst = await this.repository.findById(id);
    // Um doc de usuário não pode ser alcançado por /analysts/:id: sem esta
    // checagem, a rota viraria um atalho para os dados da cliente.
    if (!analyst || !analyst.roles?.includes(Roles.ANALYST)) {
      throw new NotFoundException(`Analista com o ID ${id} não encontrado`);
    }
    return analyst;
  }

  /** Detalhe do Analista com e-mail e status do acesso (Firebase). */
  async findOneView(id: string): Promise<AnalystDetailView> {
    const analyst = await this.findOne(id);
    const account = await this.auth.findAccount(id);
    return {
      ...analyst,
      email: account?.email ?? analyst.email ?? null,
      accessStatus: account?.accessStatus ?? null,
    };
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
   * Supervisão: os usuários cadastrados por este Analista, em DTO reduzido.
   * 404 se o analista não existe (evita devolver lista vazia para id inválido).
   */
  async findLinkedUsers(analystId: string): Promise<LinkedUser[]> {
    await this.findOne(analystId);
    const users = await this.repository.findAllWithRole(Roles.USER);
    return users
      .filter((user) => user.createdBy === analystId)

      .map((user) => ({
        fullName: user.fullName,
        isActive: user.isActive,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
}
