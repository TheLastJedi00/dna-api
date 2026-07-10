import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  Delete,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
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

  // Paginação/busca/status vêm por query string (?page&pageSize&name&status);
  // o corpo segue como array de itens (compatível com o consumidor atual) e os
  // metadados de paginação vão nos headers X-*.
  @Get('active/:orderBy/:direction')
  @Role(Roles.ADMIN, Roles.MANAGER)
  async findAllActiveUsers(
    @Param('orderBy') orderBy: string = 'fullName',
    @Param('direction') direction: string = 'asc',
    @Query() query: ListUsersQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { items, total, page, pageSize } =
      await this.usersService.findAllActiveUsers({
        orderBy,
        direction,
        ...query,
      });
    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Page-Size', pageSize);
    res.setHeader('X-Total-Pages', Math.max(1, Math.ceil(total / pageSize)));
    return items;
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
  async updateUser(@Param('id') userId: string, @Body() data: UpdateUserDto) {
    return await this.usersService.update(userId, data);
  }
}
