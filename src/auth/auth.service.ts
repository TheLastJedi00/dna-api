import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { AuthRepository } from './auth.repository';
import { Auth } from './entities/auth.entity';
import { BcryptService } from './bcrypt.service';
import { UserLoginDto } from 'src/users/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './entities/payload.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly bcyptService: BcryptService,
    private readonly jwtService: JwtService
  ) {}

  async create(data) {
    const hashPass = await this.bcyptService.hash(data.password)
    const auth = new Auth({...data, password: hashPass});
    const created = await this.repository.create(auth);
    return created;
  }

  findAll() {
    return `This action returns all auth`;
  }

  async loginByCredentials(credentials: UserLoginDto) {
    const userData = await this.repository.findByEmail(credentials.email);
    if(!userData){
      throw new UnauthorizedException("Email não cadastrado.");
    }
    const validPassword = await this.bcyptService.compare(credentials.password, userData.password);
    if(!validPassword){
      throw new UnauthorizedException("Senha inválida.");
    }
    const payload = new JwtPayload({...userData})
    return {access_token: await this.jwtService.signAsync(payload.toPlain())}
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
