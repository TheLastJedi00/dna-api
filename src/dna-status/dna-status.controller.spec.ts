import { Test, TestingModule } from '@nestjs/testing';
import { DnaStatusController } from './dna-status.controller';
import { DnaStatusService } from './dna-status.service';

describe('DnaStatusController', () => {
  let controller: DnaStatusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DnaStatusController],
      providers: [DnaStatusService],
    }).compile();

    controller = module.get<DnaStatusController>(DnaStatusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
