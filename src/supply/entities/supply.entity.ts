export class Topic {
    title!: string;
    items!: string[]

    constructor(data: Partial<Topic>){
        if(data){
            Object.assign(this, data)
        }
    }
}

export class Supply {
    id!: string;
    pillar!: string
    module!: string
    userId!: string
    topics!: Topic[]

    constructor(pillar: string, module: string, userId: string, topics: Topic[]){
        this.pillar = pillar;
        this.module = module;
        this.userId = userId,
        this.topics = topics
        this.id = this.generateId()
    }

    generateId(){
        return `${this.userId}-${this.pillar}-${this.module}`
    }
}