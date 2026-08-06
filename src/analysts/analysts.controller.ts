import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AnalystsService } from './analysts.service';
import { CreateAnalystDto } from './dto/create-analyst.dto';
import { UpdateAnalystDto } from './dto/update-analyst.dto';
import { ListAnalystsQueryDto } from './dto/list-analysts-query.dto';
import { TempPasswordDto } from '../auth/dto/temp-password.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Role } from '../decorators/role.decorator';
import { Roles } from '../enums/role.enum';

/**
 * Gestão de Analistas — exclusiva de ADMIN e MANAGER. O Analista não alcança
 * nenhuma rota daqui (critério de aceite da spec 004): ele gerencia apenas
 * Maestras, em /users.
 */
@Controller('analysts')
@UseGuards(AuthGuard, RoleGuard)
@Role(Roles.ADMIN, Roles.MANAGER)
export class AnalystsController {
  constructor(private readonly analystsService: AnalystsService) {}

  @Post()
  create(@Body() data: CreateAnalystDto) {
    return this.analystsService.create(data);
  }

  // Mesma convenção da listagem de Maestras: itens no corpo, metadados de
  // paginação nos headers X-* (expostos no CORS).
  @Get()
  async findAll(
    @Query() query: ListAnalystsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { items, total, page, pageSize } = await this.analystsService.findAll(
      { orderBy: 'fullName', direction: 'asc', ...query },
    );
    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Page-Size', pageSize);
    res.setHeader('X-Total-Pages', Math.max(1, Math.ceil(total / pageSize)));
    return items;
  }

  /** Supervisão: carteira do Analista em DTO reduzido (nome + status). */
  @Get(':id/maestras')
  findLinkedMaestras(@Param('id') id: string) {
    return this.analystsService.findLinkedMaestras(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.analystsService.findOneView(id);
  }

  // Gera a senha provisória do Analista (recuperação de acesso pelo painel).
  @Patch(':id/temp-password')
  async setTempPassword(
    @Param('id') id: string,
    @Body() { password }: TempPasswordDto,
  ) {
    await this.analystsService.setTempPassword(id, password);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.analystsService.reactivate(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateAnalystDto) {
    return this.analystsService.update(id, data);
  }

  @Delete(':id')
  disable(@Param('id') id: string) {
    return this.analystsService.disable(id);
  }
}
