import { randomUUID } from 'crypto';
import { CreateUserDto } from '../dto/create-user.dto';
import { ResponseUserDto } from '../dto/response-user.dto';
import { plainToInstance } from 'class-transformer';

export class User {
  id: string = randomUUID();
  fullName!: string;
  login!: UserLogin;
  birthDate!: string;
  birthTime!: string;
  birthPlace!: string;

  constructor(partial: Partial<CreateUserDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  response(){
    return plainToInstance(ResponseUserDto, this)
  }
}

export interface UserLogin {
  email: string;
  password: string;
}
