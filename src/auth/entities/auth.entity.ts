import { randomUUID } from 'crypto';

export class Auth {
  id: string = randomUUID();
  email!: string;
  password!: string;
  role!: string[]

  constructor(partial: Partial<Auth>){
    return Object.assign(this, partial)
  }
}
