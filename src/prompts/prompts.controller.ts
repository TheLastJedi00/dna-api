import { Body, Controller, Post } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { Prompt } from './entities/prompt.entity';

@Controller('prompts')
export class PromptsController {
    constructor(private readonly service: PromptsService){}

    // @Post()
    // createPrompt(@Body() prompt: Prompt){
    //     this.service.createPrompt(prompt)
    // }
}
