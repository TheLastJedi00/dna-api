import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt'

@Injectable()
export class BcryptService {
    async hashPassword(password: string){
        const salt = await bcrypt.genSalt(10)
        return bcrypt.hash(password, salt)
    }

    async comparePassword(password: string, hash: string){
        return bcrypt.compare(password, hash)
    }
}
