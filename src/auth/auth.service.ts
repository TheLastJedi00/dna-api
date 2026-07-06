import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { Auth } from './entities/auth.entity';
import { BcryptService } from './bcrypt.service';
import { UserLoginDto } from '../users/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './entities/payload.entity';
import { Roles } from 'src/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly bcyptService: BcryptService,
    private readonly jwtService: JwtService,
  ) {}

  async create(data, roles: string[]) {
      const compareEmail = await this.repository.findByEmail(data.email);
      if(compareEmail){
        throw new ConflictException('Email já cadastrado.')
      }
      const hashPass = await this.bcyptService.hash(data.password);
      const auth = new Auth({ ...data, password: hashPass, roles: roles });
      const created = await this.repository.create(auth);
      return created;
  }

  async loginByCredentials(credentials: UserLoginDto) {
    const userData = await this.repository.findByEmail(credentials.email);
    if (!userData) {
      throw new UnauthorizedException('Email não cadastrado.');
    }
    const validPassword = await this.bcyptService.compare(
      credentials.password,
      userData.password,
    );
    if (!validPassword) {
      throw new UnauthorizedException('Senha inválida.');
    }
    const payload = new JwtPayload({
      id: userData.id,
      email: userData.email,
      roles: userData.roles,
    });
    return this.issueTokens(payload);
  }

  /**
   * Renova o par de tokens a partir de um refresh token válido (stateless).
   * A rotação/revogação persistente (blocklist) é adicionada na Fase 3 com Redis.
   */
  async refresh(refreshToken: string) {
    let decoded: JwtPayload;
    try {
      decoded = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }
    const payload = new JwtPayload({
      id: decoded.id,
      email: decoded.email,
      roles: decoded.roles,
    });
    return this.issueTokens(payload);
  }

  private async issueTokens(payload: JwtPayload) {
    const access_token = await this.jwtService.signAsync(payload.toPlain());
    const refresh_token = await this.jwtService.signAsync(payload.toPlain(), {
      secret: this.refreshSecret(),
      expiresIn: (process.env.JWT_REFRESH_EXPIRES ?? '7d') as any,
    });
    return { access_token, refresh_token };
  }

  private refreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET não configurado no ambiente.');
    }
    return secret;
  }
}
