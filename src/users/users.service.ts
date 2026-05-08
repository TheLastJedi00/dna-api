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

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly auth: AuthService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const userAuth = await this.auth.create(createUserDto.login);
      const object = new User(createUserDto, userAuth.id);
      await this.repository.create(object);
    } catch (e) {
      throw new Error('[Service Error]: ' + e);
    }
  }

  async findAllActiveUsers(page: string, orderBy: string, direction: string) {
    const validDirections = ['asc', 'desc'];
    if(!validDirections.includes(direction)){
      throw new NotFoundException('Valor de ordem não existe, precisa ser "asc" ou "desc."')
    }
    const users = this.repository.findAllActiveUsers(
      Number(page),
      20,
      orderBy,
      direction
    );
  }

  findAll() {
    return `This action returns all users`;
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

  async findMe(idFromToken: string, idFromUrl: string) {
    if (idFromToken !== idFromUrl) {
      throw new UnauthorizedException(
        'Impossível consultar dados de outro usuário.',
      );
    }
    return await this.repository.findById(idFromUrl);
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
