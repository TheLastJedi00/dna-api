import { Injectable, NotFoundException } from '@nestjs/common';
import { PromptsRepository } from './prompts.repository';

@Injectable()
export class PromptsService {
    constructor(private readonly repository: PromptsRepository){}

    async findByCategory(category: string){
        const prompt = await this.repository.findPromptByCategory(category)
        if(!prompt){
            throw new NotFoundException(`Prompt for "${category}" category not found.`)
        }
        return prompt
    }
}
