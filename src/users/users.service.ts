import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { User } from './entities/user.entity';
import { AuthService } from 'src/auth/auth.service';
import { Roles } from 'src/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly auth: AuthService,
  ) {}

  async createMaestra(data: CreateUserDto) {
    // Fonte de verdade de autorização = documento `auth` (as roles do JWT saem
    // dele). `users.roles` é uma cópia denormalizada usada só para
    // listagem/filtro (findAllActiveUsers) e é gravada atomicamente aqui com o
    // mesmo valor. Qualquer futura mutação de role deve atualizar os dois.
    const roles = ['USER'];
    const userAuth = await this.auth.create(data.login, roles);
    const object = new User(data, userAuth.id, roles);
    await this.repository.create(object);
  }

  /**
   * Listagem paginada de Maestras (role USER). Busca os candidatos no
   * repositório e aplica filtro de status, ordenação e paginação em memória
   * (volume esperado é pequeno; evita índice composto no Firestore).
   */
  async findAllActiveUsers(options: {
    orderBy: string;
    direction: string;
    page?: number;
    pageSize?: number;
  }) {
    const { orderBy, direction } = options;
    if (direction !== 'asc' && direction !== 'desc') {
      throw new BadRequestException('Direção inválida: use "asc" ou "desc".');
    }
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 10;

    const all = await this.repository.findAllWithRole(Roles.USER);
    const active = all.filter((user) => user.isActive);
    const sorted = this.sortUsers(active, orderBy, direction);

    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);

    return { items, total, page, pageSize };
  }

  private sortUsers(users: User[], orderBy: string, direction: string): User[] {
    const dir = direction === 'desc' ? -1 : 1;
    return [...users].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[orderBy];
      const bv = (b as unknown as Record<string, unknown>)[orderBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  async findOne(id: string) {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(
        `User with ID ${id} not found in users collection.`,
      );
    }
    return user;
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

  async disable(id: string) {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuário com o ID ${id} não encontrado`);
    }
    user.disable();
    const updated = await this.repository.update(id, user);
    if (!updated) {
      throw new NotFoundException(`Usuário com o ID ${id} não encontrado`);
    }
    return updated;
  }

  async reactivate(id: string) {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuário com o ID ${id} não encontrado`);
    }
    user.enable();
    return await this.repository.update(id, user);
  }

  async update(id: string, data: UpdateUserDto) {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuário com o ID ${id} não encontrado`);
    }
    user.applyUpdate(data);
    return await this.repository.update(id, user);
  }
}
