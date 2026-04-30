import { Injectable } from '@nestjs/common';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { AuthRepository } from './auth.repository';
import { Auth } from './entities/auth.entity';

@Injectable()
export class AuthService {
  constructor(private readonly repository: AuthRepository){}

  create(data) {
    const auth = new Auth(data);
    const created = this.repository.create(auth)
    return created
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: string) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
