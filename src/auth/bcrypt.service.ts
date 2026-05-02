import { Injectable, PipeTransform } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BcryptService {
  async hash(password: string) {
    return await bcrypt.hash(password, 12);
  }

  async compare(password: string, hash: string){
    return await bcrypt.compare(password, hash);
  }
}
