import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DnaStatusService } from './dna-status.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { OwnershipGuard } from 'src/auth/guards/ownership.guard';

@Controller('dna-status')
@UseGuards(AuthGuard, OwnershipGuard)
export class DnaStatusController {
  constructor(private readonly dnaStatusService: DnaStatusService) {}

  @Get(':userId')
  getStatus(@Param('userId') userId: string) {
    return this.dnaStatusService.getStatusByUser(userId);
  }
}
