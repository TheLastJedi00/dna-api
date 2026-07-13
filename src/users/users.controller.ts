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
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Role } from '../decorators/role.decorator';
import { Roles } from '../enums/role.enum';
import { Ownership } from '../decorators/ownership.decorator';

@Controller('users')
@UseGuards(AuthGuard, RoleGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // O vínculo da Maestra com o criador sai do token (não do corpo): quem
  // cadastra é sempre o usuário logado, seja Analista ou Manager.
  @Post('maestra')
  @Role(Roles.ADMIN, Roles.MANAGER, Roles.ANALYST)
  createMaestra(
    @Body() data: CreateUserDto,
    @Ownership('id') creatorId: string,
  ) {
    return this.usersService.createMaestra(data, creatorId);
  }

  // Paginação/busca/status vêm por query string (?page&pageSize&name&status);
  // o corpo segue como array de itens (compatível com o consumidor atual) e os
  // metadados de paginação vão nos headers X-*.
  @Get('active/:orderBy/:direction')
  @Role(Roles.ADMIN, Roles.MANAGER, Roles.ANALYST)
  async findAllActiveUsers(
    @Param('orderBy') orderBy: string = 'fullName',
    @Param('direction') direction: string = 'asc',
    @Query() query: ListUsersQueryDto,
    @Ownership('id') requesterId: string,
    @Ownership('roles') requesterRoles: string[],
    @Res({ passthrough: true }) res: Response,
  ) {
    const { items, total, page, pageSize } =
      await this.usersService.findAllActiveUsers({
        orderBy,
        direction,
        ...query,
        requesterId,
        requesterRoles,
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

  // Rotas de gestão da Maestra: a role sozinha não basta — o service ainda
  // valida a posse (createdBy), senão um Analista alcançaria a Maestra de
  // outro pelo id. ADMIN segue como super-usuário.
  @Get(':id')
  @Role(Roles.ADMIN, Roles.MANAGER, Roles.ANALYST)
  findOne(
    @Param('id') id: string,
    @Ownership('id') requesterId: string,
    @Ownership('roles') requesterRoles: string[],
  ) {
    return this.usersService.findOneView(id, {
      id: requesterId,
      roles: requesterRoles,
    });
  }

  @Delete(':id')
  @Role(Roles.ADMIN, Roles.MANAGER, Roles.ANALYST)
  async disableUser(
    @Param('id') userId: string,
    @Ownership('id') requesterId: string,
    @Ownership('roles') requesterRoles: string[],
  ) {
    return await this.usersService.disable(userId, {
      id: requesterId,
      roles: requesterRoles,
    });
  }

  @Patch(':id/reactivate')
  @Role(Roles.ADMIN, Roles.MANAGER, Roles.ANALYST)
  async reactivateUser(
    @Param('id') userId: string,
    @Ownership('id') requesterId: string,
    @Ownership('roles') requesterRoles: string[],
  ) {
    return await this.usersService.reactivate(userId, {
      id: requesterId,
      roles: requesterRoles,
    });
  }

  @Patch(':id')
  @Role(Roles.ADMIN, Roles.MANAGER, Roles.ANALYST)
  async updateUser(
    @Param('id') userId: string,
    @Body() data: UpdateUserDto,
    @Ownership('id') requesterId: string,
    @Ownership('roles') requesterRoles: string[],
  ) {
    return await this.usersService.update(userId, data, {
      id: requesterId,
      roles: requesterRoles,
    });
  }
}
