import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AstrologyService } from './astrology.service';
import { CreateAstrologyDto } from './dto/create-astrology.dto';
import { UpdateAstrologyDto } from './dto/update-astrology.dto';
import { Role } from '../decorators/role.decorator';
import { Roles } from '../enums/role.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { OwnershipGuard } from '../auth/guards/ownership.guard';

@Controller('astrology')
@UseGuards(AuthGuard, RoleGuard)
export class AstrologyController {
  constructor(private readonly astrologyService: AstrologyService) {}

  @Post()
  @Role(Roles.ADMIN)
  async create(@Body() createAstrologyDto: CreateAstrologyDto) {
    return await this.astrologyService.create(createAstrologyDto);
  }

  @Get('user/:userId')
  @UseGuards(OwnershipGuard)
  async findOneByUser(@Param('userId') userId: string) {
    return await this.astrologyService.findOneByUser(userId);
  }

  @Get(':id')
  @Role(Roles.ADMIN, Roles.MANAGER)
  async findOne(@Param('id') id: string) {
    return await this.astrologyService.findOne(id);
  }

  @Patch(':id')
  @Role(Roles.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateAstrologyDto: UpdateAstrologyDto,
  ) {
    return await this.astrologyService.update(id, updateAstrologyDto);
  }

  @Delete(':id')
  @Role(Roles.ADMIN)
  async remove(@Param('id') id: string) {
    return await this.astrologyService.remove(id);
  }
}
