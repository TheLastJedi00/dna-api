import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { Prompt } from './entities/prompt.entity';

@Controller('prompts')
export class PromptsController {
  constructor(private readonly service: PromptsService) {}

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  async createManyPrompts(@Body() body: { prompts: Prompt[] }) {
    await this.service.createManyPrompts(body.prompts);
    return { message: `${body.prompts.length} prompt(s) criado(s) com sucesso.` };
  }
}
