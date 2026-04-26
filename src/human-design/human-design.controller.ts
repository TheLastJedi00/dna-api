import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { HumanDesignService } from './human-design.service';
import { CreateHumanDesignDto } from './dto/create-human-design.dto';
import { UpdateHumanDesignDto } from './dto/update-human-design.dto';
import { error } from 'console';

@Controller('human-design')
export class HumanDesignController {
  constructor(private readonly humanDesignService: HumanDesignService) {}

  @Post()
  async create(@Body() createHumanDesignDto: CreateHumanDesignDto) {
    return await this.humanDesignService.create(createHumanDesignDto);
  }

  @Get()
  findAll() {
    return this.humanDesignService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.humanDesignService.findOne(id);
  }

  @Get('user/:userId')
  async findOneByUser(@Param('userId') userId: string) {
    return await this.humanDesignService.findOneByUser(userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateHumanDesignDto: UpdateHumanDesignDto,
  ) {
    return this.humanDesignService.update(+id, updateHumanDesignDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.humanDesignService.remove(+id);
  }
}
