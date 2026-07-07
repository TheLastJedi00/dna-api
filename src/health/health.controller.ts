import { Controller, Get, Inject } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { CacheService } from '../redis/cache.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
    private readonly cache: CacheService,
  ) {}

  @Get()
  async check() {
    let redisStatus: 'up' | 'down' | 'disabled' = 'disabled';
    if (this.redis) {
      try {
        redisStatus = (await this.redis.ping()) === 'PONG' ? 'up' : 'down';
      } catch {
        redisStatus = 'down';
      }
    }
    return {
      status: 'ok',
      redis: redisStatus,
      cache: this.cache.stats(),
    };
  }
}
