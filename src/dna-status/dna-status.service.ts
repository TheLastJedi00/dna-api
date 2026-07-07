import { Injectable } from '@nestjs/common';
import { HumanDesignService } from '../human-design/human-design.service';
import { DnaStatus } from './entities/dna-status.entity';
import { NumerologyService } from 'src/numerology/numerology.service';
import { AstrologyService } from 'src/astrology/astrology.service';
import { CacheService } from 'src/redis/cache.service';

const DNA_STATUS_TTL = 60; // 1min

@Injectable()
export class DnaStatusService {
  constructor(
    private readonly humanDesignService: HumanDesignService,
    private readonly numerologyService: NumerologyService,
    private readonly astrologyService: AstrologyService,
    private readonly cache: CacheService,
  ) {}

  async getStatusByUser(userId: string): Promise<DnaStatus> {
    return this.cache.getOrSet(
      `dna-status:${userId}`,
      DNA_STATUS_TTL,
      async () => {
        const [astro, hd, num] = await Promise.all([
          this.astrologyService.checkExistence(userId),
          this.humanDesignService.checkExistence(userId),
          this.numerologyService.checkExistence(userId),
        ]);
        return new DnaStatus(hd, num, astro);
      },
    );
  }
}
