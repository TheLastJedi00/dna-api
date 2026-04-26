import { CreateUserDto } from '../dto/create-user.dto';
import { ResponseUserDto } from '../dto/response-user.dto';
import { plainToInstance } from 'class-transformer';

export class User {
  id!: string;
  fullName!: string;
  birthDate!: string;
  birthTime!: string;
  birthPlace!: string;

  constructor(dto: CreateUserDto, id: string) {
    this.id = id;
    this.fullName = dto.fullName;
    this.birthDate = dto.birthDate;
    this.birthTime = dto.birthTime;
    this.birthPlace = dto.birthPlace;
  }

  response(){
    return plainToInstance(ResponseUserDto, this)
  }
}
