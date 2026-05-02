import { randomUUID } from 'crypto';

export class Auth {
  id: string = randomUUID();
  email!: string;
  password!: string;
  roles!: string[]

  constructor(partial: Partial<Auth>){
    return Object.assign(this, partial)
  }
}
