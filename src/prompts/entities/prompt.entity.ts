export class Prompt {
    category!: string;
    part!: number
    prompt!: string

    constructor(partial: Partial<{}>){
        return Object.assign(this, partial)
    }
}