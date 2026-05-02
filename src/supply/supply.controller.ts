import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { SupplyService } from './supply.service';
import { RequestDto } from './dtos/request.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Role } from '../decorators/role.decorator';
import { Roles } from '../enums/role.enum';

@Controller('supply')
@UseGuards(AuthGuard, RoleGuard)
export class SupplyController {
  constructor(private readonly service: SupplyService) {}

  @Post()
  async requestGemini(@Body() content: RequestDto) {
    await this.service.request(content);
  }

  @Post('/:pillar/:module/:userId')
  @Role(Roles.ADMIN)
  async createModuleByUserIdAnPillarAndModule(
    @Param('userId') id: string,
    @Param('pillar') pillar: string,
    @Param('module') module: string,
  ) {
    return await this.service.createModuleByUserIdAndPillar(id, pillar, module);
  }

  @Post('/:pillar/:userId')
  @Role(Roles.ADMIN)
  async createFullPillarByUserId(
    @Param('userId') id: string,
    @Param('pillar') pillar: string,
  ) {
    return await this.service.createFullPillarByUserId(id, pillar);
  }
}
