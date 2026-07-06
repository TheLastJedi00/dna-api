import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { CreatePromptsBatchDto } from './dto/create-prompt.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Role } from '../decorators/role.decorator';
import { Roles } from '../enums/role.enum';

@Controller('prompts')
@UseGuards(AuthGuard, RoleGuard)
export class PromptsController {
  constructor(private readonly service: PromptsService) {}

  @Post('batch')
  @Role(Roles.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createManyPrompts(@Body() body: CreatePromptsBatchDto) {
    await this.service.createManyPrompts(body.prompts);
    return { message: `${body.prompts.length} prompt(s) criado(s) com sucesso.` };
  }
}
