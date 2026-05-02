export class JwtPayload {
    id!: string
    email!: string
    role!: string[]

    constructor(partial: Partial<JwtPayload>){
        Object.assign(this, partial)
    }

    toPlain(){
        return {
            ...this
        }
    }
}