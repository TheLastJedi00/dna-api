import {
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

  async findAllActiveUsers(orderBy: string, direction: string) {
    const validDirections = ['asc', 'desc'];
    if (!validDirections.includes(direction)) {
      throw new NotFoundException(
        'Valor de ordem não existe, precisa ser "asc" ou "desc."',
      );
    }
    const users = await this.repository.findAllActiveUsers(orderBy, direction);

    return users;
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
