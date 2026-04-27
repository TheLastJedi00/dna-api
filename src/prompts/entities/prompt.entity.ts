export class Prompt {
    pillar!: string;
    module!: string
    prompt!: string

    constructor(partial: Partial<{}>){
        return Object.assign(this, partial)
    }
}