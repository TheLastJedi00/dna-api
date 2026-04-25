import { randomUUID } from 'crypto';
import { CreateUserDto } from '../dto/create-user.dto';

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
}

export interface UserLogin {
  email: string;
  password: string;
}
