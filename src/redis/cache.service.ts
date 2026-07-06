import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Cache leve sobre Redis. Se não houver client (REDIS_URL ausente ou Redis
 * fora do ar), todas as operações viram no-op e o chamador segue direto para
 * a fonte (Firestore/IA) — degradação graciosa.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis | null) {}

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (e) {
      this.logger.warn(`get falhou (${key}): ${(e as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (e) {
      this.logger.warn(`set falhou (${key}): ${(e as Error).message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch (e) {
      this.logger.warn(`del falhou: ${(e as Error).message}`);
    }
  }

  /**
   * Retorna o valor em cache ou executa `factory`, cacheando o resultado.
   * Se `factory` lançar (ex.: NotFound), nada é cacheado e o erro propaga.
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
