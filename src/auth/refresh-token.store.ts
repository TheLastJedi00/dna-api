import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

/**
 * Allowlist de refresh tokens em Redis (chave por usuário + jti, com TTL).
 * Suporta rotação (revoke do jti antigo a cada refresh) e revogação no logout.
 * Sem Redis, `isValid` retorna true (fallback stateless das Fases 0–2).
 */
@Injectable()
export class RefreshTokenStore {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis | null) {}

  private key(userId: string, jti: string): string {
    return `refresh:${userId}:${jti}`;
  }

  async store(userId: string, jti: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    await this.client.set(this.key(userId, jti), '1', 'EX', ttlSeconds);
  }

  async isValid(userId: string, jti: string): Promise<boolean> {
    if (!this.client) return true;
    return (await this.client.exists(this.key(userId, jti))) === 1;
  }

  async revoke(userId: string, jti: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(this.key(userId, jti));
  }

  async revokeAll(userId: string): Promise<void> {
    if (!this.client) return;
    const keys = await this.client.keys(`refresh:${userId}:*`);
    if (keys.length) await this.client.del(...keys);
  }
}
