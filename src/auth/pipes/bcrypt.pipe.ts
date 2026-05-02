import { Injectable, PipeTransform } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BcryptPipe implements PipeTransform {
  private readonly salt = process.env.SALT;

  async transform(password: string) {
    if(!this.salt){
      throw Error("SALT não definido nas variáveis de ambiente.")
    }
    return await bcrypt.hash(password, this.salt);
  }

  async compare(password: string, hash: string){
    return await bcrypt.compare(password, hash);
  }
}
