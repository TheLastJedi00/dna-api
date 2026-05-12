import { Injectable } from '@nestjs/common';
import { HumanDesignService } from '../human-design/human-design.service';
import { DnaStatus } from './entities/dna-status.entity';

@Injectable()
export class DnaStatusService {
  constructor(private readonly humanDesignService: HumanDesignService) {}

  async getStatusByUser(userId: string): Promise<DnaStatus> {
    const status = new DnaStatus();

    try {
      const hd = await this.humanDesignService.findOneByUser(userId);
      status.human_design = !!hd;
    } catch {
      status.human_design = false;
    }

    // numerology e astrology: sempre false até que os módulos sejam criados
    return status;
  }
}
