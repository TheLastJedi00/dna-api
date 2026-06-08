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
import { HumanDesignService } from './human-design.service';
import { CreateHumanDesignDto } from './dto/create-human-design.dto';
import { UpdateHumanDesignDto } from './dto/update-human-design.dto';
import { Role } from '../decorators/role.decorator';
import { Roles } from '../enums/role.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';

@Controller('human-design')
@UseGuards(AuthGuard, RoleGuard)
export class HumanDesignController {
  constructor(private readonly humanDesignService: HumanDesignService) {}

  @Post()
  @Role(Roles.ADMIN)
  async create(@Body() createHumanDesignDto: CreateHumanDesignDto) {
    return await this.humanDesignService.create(createHumanDesignDto);
  }

  @Get()
  @Role(Roles.ADMIN)
  findAll() {
    return this.humanDesignService.findAll();
  }

  @Get(':id')
  @Role(Roles.ADMIN, Roles.MANAGER)
  async findOne(@Param('id') id: string) {
    return await this.humanDesignService.findOne(id);
  }

  @Get('user/:userId')
  async findOneByUser(@Param('userId') userId: string) {
    return await this.humanDesignService.findOneByUser(userId);
  }

  @Patch(':id')
  @Role(Roles.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateHumanDesignDto: UpdateHumanDesignDto,
  ) {
    return this.humanDesignService.update(+id, updateHumanDesignDto);
  }

  @Delete(':id')
  @Role(Roles.ADMIN)
  remove(@Param('id') id: string) {
    return this.humanDesignService.remove(+id);
  }
}
