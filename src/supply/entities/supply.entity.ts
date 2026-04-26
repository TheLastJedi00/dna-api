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
    dnaModule!: string
    moduleTitle!: string
    userId!: string
    topics!: Topic[]

    constructor(dnaModule: string, moduleTitle: string, userId: string, topics: Topic[]){
        this.dnaModule = dnaModule;
        this.moduleTitle = moduleTitle;
        this.userId = userId,
        this.topics = topics
        this.id = this.generateId()
    }

    generateId(){
        return `${this.userId}-${this.dnaModule}-${this.moduleTitle}`
    }
}