import {
  ConflictException,
  Injectable,
  NotFoundException,
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

  /**
   * A senha definida no cadastro **já nasce provisória** (spec 005): vale para o
   * login, mas o usuário é obrigado a trocá-la no primeiro acesso, e até lá ela
   * fica visível em texto plano para quem o cadastrou.
   */
  async create(data, roles: string[]) {
    const compareEmail = await this.repository.findByEmail(data.email);
    if (compareEmail) {
      throw new ConflictException('Email já cadastrado.');
    }
    const hashPass = await this.bcyptService.hash(data.password);
    const auth = new Auth({
      ...data,
      password: hashPass,
      roles: roles,
      mustChangePassword: true,
      tempPassword: data.password,
    });
    const created = await this.repository.create(auth);
    return created;
  }

  /**
   * Redefinição pelo painel: o gestor digita a senha, ela passa a valer para o
   * login e fica visível para ele até o usuário definir a própria.
   */
  async setTempPassword(id: string, password: string): Promise<void> {
    const auth = await this.repository.findById(id);
    if (!auth) {
      throw new NotFoundException(`Credenciais do ID ${id} não encontradas.`);
    }
    await this.repository.update(id, {
      password: await this.bcyptService.hash(password),
      mustChangePassword: true,
      tempPassword: password,
    });
  }

  /**
   * O usuário define a senha definitiva: apaga o rastro da provisória e reemite
   * o par de tokens — o access token em mãos carrega o claim antigo
   * (`mustChangePassword: true`) e, sem trocá-lo, o usuário seguiria preso na
   * tela de troca.
   */
  async changePassword(id: string, newPassword: string) {
    const auth = await this.repository.findById(id);
    if (!auth) {
      throw new NotFoundException(`Credenciais do ID ${id} não encontradas.`);
    }
    await this.repository.update(id, {
      password: await this.bcyptService.hash(newPassword),
      mustChangePassword: false,
      tempPassword: null,
    });
    const payload = new JwtPayload({
      id: auth.id,
      email: auth.email,
      roles: auth.roles,
      mustChangePassword: false,
    });
    return this.issueTokens(payload);
  }

  /** Credenciais de um id, para compor o detalhe do usuário. */
  async findCredentialsById(id: string) {
    return await this.repository.findById(id);
  }

  /**
   * E-mail de acesso de um id. Usado para identificar quem cadastrou uma
   * Maestra quando o criador não tem perfil em `users` (caso do Manager).
   */
  async findEmailById(id: string): Promise<string | null> {
    const auth = await this.repository.findById(id);
    return auth?.email ?? null;
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
      mustChangePassword: userData.mustChangePassword ?? false,
    });
    const tokens = await this.issueTokens(payload);
    // A spec pede o status também no corpo da resposta do login; a fonte de
    // verdade do bloqueio, porém, é o claim do token.
    return { ...tokens, mustChangePassword: payload.mustChangePassword };
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
      // Preserva o bloqueio: renovar o token não pode ser um jeito de escapar da
      // troca obrigatória.
      mustChangePassword: decoded.mustChangePassword ?? false,
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
