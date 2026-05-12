import { Test, TestingModule } from '@nestjs/testing';
import { DnaStatusService } from './dna-status.service';

describe('DnaStatusService', () => {
  let service: DnaStatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DnaStatusService],
    }).compile();

    service = module.get<DnaStatusService>(DnaStatusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
