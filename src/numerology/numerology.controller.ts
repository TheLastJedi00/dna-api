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
import { NumerologyService } from './numerology.service';
import { CreateNumerologyDto } from './dto/create-numerology.dto';
import { UpdateNumerologyDto } from './dto/update-numerology.dto';
import { Role } from '../decorators/role.decorator';
import { Roles } from '../enums/role.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';

@Controller('numerology')
@UseGuards(AuthGuard, RoleGuard)
export class NumerologyController {
  constructor(private readonly numerologyService: NumerologyService) {}

  @Post()
  @Role(Roles.ADMIN)
  async create(@Body() createNumerologyDto: CreateNumerologyDto) {
    return await this.numerologyService.create(createNumerologyDto);
  }

  @Get()
  @Role(Roles.ADMIN)
  findAll() {
    return this.numerologyService.findAll();
  }

  @Get('user/:userId')
  @Role(Roles.USER)
  async findOneByUser(@Param('userId') userId: string) {
    return await this.numerologyService.findOneByUser(userId);
  }

  @Get(':id')
  @Role(Roles.ADMIN, Roles.MANAGER)
  async findOne(@Param('id') id: string) {
    return await this.numerologyService.findOne(id);
  }

  @Patch(':id')
  @Role(Roles.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateNumerologyDto: UpdateNumerologyDto,
  ) {
    return await this.numerologyService.update(id, updateNumerologyDto);
  }

  @Delete(':id')
  @Role(Roles.ADMIN)
  async remove(@Param('id') id: string) {
    return await this.numerologyService.remove(id);
  }
}

