import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Role } from '../decorators/role.decorator';
import { Roles } from '../enums/role.enum';

@Controller('users')
@UseGuards(AuthGuard, RoleGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Role(Roles.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Role(Roles.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

}
