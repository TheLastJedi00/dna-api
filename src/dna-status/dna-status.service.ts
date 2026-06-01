import { Injectable } from '@nestjs/common';
import { HumanDesignService } from '../human-design/human-design.service';
import { DnaStatus } from './entities/dna-status.entity';
import { NumerologyService } from 'src/numerology/numerology.service';

@Injectable()
export class DnaStatusService {
  constructor(
    private readonly humanDesignService: HumanDesignService,
    private readonly numerologyService: NumerologyService,
  ) {}

  async getStatusByUser(userId: string): Promise<DnaStatus> {
    let status: DnaStatus;

    try {
      const hd = await this.humanDesignService.findOneByUser(userId);
      const num = await this.numerologyService.findOneByUser(userId);
      status = new DnaStatus(!!hd, !!num, false)
    } catch {
      status = new DnaStatus(false, false, false)
    }
    return status;
  }
}
