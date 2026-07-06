import { Global, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { CacheService } from './cache.service';

const redisProvider = {
  provide: REDIS_CLIENT,
  useFactory: (): Redis | null => {
    const url = process.env.REDIS_URL;
    if (!url) {
      Logger.warn(
        'REDIS_URL não definido — cache, rate-limit distribuído e sessão sem Redis (modo degradado).',
        'RedisModule',
      );
      return null;
    }
    const client = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      lazyConnect: false,
    });
    client.on('error', (e) =>
      Logger.error(`Erro de conexão Redis: ${e.message}`, 'RedisModule'),
    );
    client.on('connect', () => Logger.log('Redis conectado.', 'RedisModule'));
    return client;
  },
};

@Global()
@Module({
  providers: [redisProvider, CacheService],
  exports: [REDIS_CLIENT, CacheService],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis | null) {}

  /** Health check: true se o Redis responde ao PING. */
  async isHealthy(): Promise<boolean> {
    if (!this.client) return false;
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }
}
