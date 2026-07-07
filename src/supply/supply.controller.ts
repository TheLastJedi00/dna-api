import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SupplyService } from './supply.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { OwnershipGuard } from '../auth/guards/ownership.guard';
import { Role } from '../decorators/role.decorator';
import { Roles } from '../enums/role.enum';
import type { HumanDesignModuleType } from './entities/supply.entity';

@Controller('supply')
@UseGuards(AuthGuard, RoleGuard)
export class SupplyController {
  constructor(private readonly service: SupplyService) {}

  @Post('/:pillar/:module/:userId')
  @Role(Roles.ADMIN, Roles.MANAGER)
  async createModuleByUserIdAnPillarAndModule(
    @Param('userId') id: string,
    @Param('pillar') pillar: string,
    @Param('module') module: string,
  ) {
    return await this.service.createModuleByUserIdAndPillar(id, pillar, module);
  }

  @Post('/:pillar/:userId')
  @Role(Roles.ADMIN, Roles.MANAGER)
  async createFullPillarByUserId(
    @Param('userId') id: string,
    @Param('pillar') pillar: string,
  ) {
    return await this.service.createFullPillarByUserId(id, pillar);
  }

  @Get('human-design/:module/:userId')
  @UseGuards(OwnershipGuard)
  async getHumanDesignModuleByUserId(
    @Param('userId') userId: string,
    @Param('module') module: HumanDesignModuleType,
  ) {
    return await this.service.findHumanDesignModuleByUserId(userId, module);
  }

  @Get('numerology/:module/:userId')
  @UseGuards(OwnershipGuard)
  async getNumerologyModuleByUserId(
    @Param('userId') userId: string,
    @Param('module') module: string,
  ) {
    return await this.service.findNumerologyModuleByUserId(userId, module);
  }

  @Get('astrology/:module/:userId')
  @UseGuards(OwnershipGuard)
  async getAstrologyModuleByUserId(
    @Param('userId') userId: string,
    @Param('module') module: string,
  ) {
    return await this.service.findAstrologyModuleByUserId(userId, module);
  }

  @Get('perfect-plain/:userId')
  @UseGuards(OwnershipGuard)
  async getPerfectPlainByUserId(@Param('userId') userId: string) {
    return await this.service.findPerfectPlainByUserId(userId);
  }

  @Get('check/:userId/:pillar')
  @Role(Roles.ADMIN, Roles.MANAGER)
  async isSupplyCreatedForThisUser(
    @Param('userId') userId: string,
    @Param('pillar') pillar: string,
  ) {
    return await this.service.checkSupplyByUserIdAndPillar(userId, pillar);
  }
}
