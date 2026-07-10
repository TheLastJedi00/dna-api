import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Role } from '../decorators/role.decorator';
import { Roles } from '../enums/role.enum';
import { Ownership } from 'src/decorators/ownership.decorator';

@Controller('users')
@UseGuards(AuthGuard, RoleGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('maestra')
  @Role(Roles.ADMIN)
  createMaestra(@Body() data: CreateUserDto) {
    return this.usersService.createMaestra(data);
  }

  @Get('active/:orderBy/:direction')
  @Role(Roles.ADMIN, Roles.MANAGER)
  async findAllActiveUsers(
    @Param('orderBy') orderBy: string = 'fullName',
    @Param('direction') direction: string = 'asc',
  ) {
    return await this.usersService.findAllActiveUsers(orderBy, direction);
  }

  @Get('me/:id')
  async findMe(
    @Ownership('id') idFromToken: string,
    @Ownership('roles') rolesFromToken: string[],
    @Param('id') idFromUrl: string,
  ) {
    return await this.usersService.findMe(
      idFromToken,
      rolesFromToken,
      idFromUrl,
    );
  }

  @Get(':id')
  @Role(Roles.ADMIN, Roles.MANAGER)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Delete(':id')
  @Role(Roles.ADMIN, Roles.MANAGER)
  async disableUser(@Param('id') userId: string) {
    return await this.usersService.disable(userId);
  }

  @Patch(':id/reactivate')
  @Role(Roles.ADMIN, Roles.MANAGER)
  async reactivateUser(@Param('id') userId: string) {
    return await this.usersService.reactivate(userId);
  }

  @Patch(':id')
  @Role(Roles.ADMIN, Roles.MANAGER)
  async updateUser(
    @Param('id') userId: string,
    @Body() data: UpdateUserDto,
  ) {
    return await this.usersService.update(userId, data);
  }
}
