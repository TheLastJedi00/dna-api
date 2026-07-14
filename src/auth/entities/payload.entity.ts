export class JwtPayload {
    id!: string
    email!: string
    roles!: string[]
    /**
     * true enquanto a senha em uso for provisória. Vai no token (e não só na
     * resposta do login) para que o bloqueio da troca obrigatória sobreviva a um
     * reload ou a uma URL digitada à mão — sem isso o modal seria burlável.
     */
    mustChangePassword!: boolean

    constructor(partial: Partial<JwtPayload>){
        Object.assign(this, partial)
    }

    toPlain(){
        return {
            ...this
        }
    }
}