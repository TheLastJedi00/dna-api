import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthRepository } from './auth.repository';
import { Auth } from './entities/auth.entity';
import { BcryptService } from './bcrypt.service';
import { UserLoginDto } from '../users/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './entities/payload.entity';
import { RefreshTokenStore } from './refresh-token.store';

const REFRESH_TTL_SECONDS = Number(process.env.JWT_REFRESH_TTL_SECONDS) || 60 * 60 * 24 * 7;

type RefreshPayload = JwtPayload & { jti?: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly bcyptService: BcryptService,
    private readonly jwtService: JwtService,
    private readonly refreshStore: RefreshTokenStore,
  ) {}

  async create(data, roles: string[]) {
    const compareEmail = await this.repository.findByEmail(data.email);
    if (compareEmail) {
      throw new ConflictException('Email já cadastrado.');
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
   * Renova o par de tokens a partir de um refresh válido, com rotação:
   * o jti usado é revogado e um novo par é emitido. Se o jti não estiver na
   * allowlist do Redis (revogado/rotacionado), a renovação é negada.
   */
  async refresh(refreshToken: string) {
    let decoded: RefreshPayload;
    try {
      decoded = await this.jwtService.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }
    if (!decoded.jti || !(await this.refreshStore.isValid(decoded.id, decoded.jti))) {
      throw new UnauthorizedException('Sessão revogada. Faça login novamente.');
    }
    await this.refreshStore.revoke(decoded.id, decoded.jti);
    const payload = new JwtPayload({
      id: decoded.id,
      email: decoded.email,
      roles: decoded.roles,
    });
    return this.issueTokens(payload);
  }

  /** Revoga o refresh token informado (logout). Ignora tokens inválidos. */
  async logout(refreshToken: string): Promise<void> {
    try {
      const decoded = await this.jwtService.verifyAsync<RefreshPayload>(
        refreshToken,
        { secret: this.refreshSecret() },
      );
      if (decoded.jti) {
        await this.refreshStore.revoke(decoded.id, decoded.jti);
      }
    } catch {
      // token inválido/expirado: nada a revogar
    }
  }

  private async issueTokens(payload: JwtPayload) {
    const jti = randomUUID();
    const access_token = await this.jwtService.signAsync(payload.toPlain());
    const refresh_token = await this.jwtService.signAsync(payload.toPlain(), {
      secret: this.refreshSecret(),
      expiresIn: (process.env.JWT_REFRESH_EXPIRES ?? '7d') as any,
      jwtid: jti,
    });
    await this.refreshStore.store(payload.id, jti, REFRESH_TTL_SECONDS);
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
