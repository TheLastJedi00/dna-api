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

    const hd = await this.humanDesignService.checkExistence(userId);
    const num = await this.numerologyService.checkExistence(userId);
    status = new DnaStatus(hd, num, false);

    return status;
  }
}
