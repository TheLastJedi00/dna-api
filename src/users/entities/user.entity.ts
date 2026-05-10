import { CreateUserDto } from '../dto/create-user.dto';

export class User {
  id!: string;
  fullName!: string;
  birthDate!: string;
  birthTime!: string;
  birthPlace!: string;
  isActive!: boolean;

  constructor(data: CreateUserDto, id?: string) {
    this.id = id? id : data.id!
    this.fullName = data.fullName;
    this.birthDate = data.birthDate;
    this.birthTime = data.birthTime;
    this.birthPlace = data.birthPlace;
    this.isActive = true;
  }

  disable() {
    this.isActive = false;
  }

  createDtoToEntity(dto: CreateUserDto, id: string) {
    this.id = id;
    this.fullName = dto.fullName;
    this.birthDate = dto.birthDate;
    this.birthTime = dto.birthTime;
    this.birthPlace = dto.birthPlace;
  }

  toUserDataPrompt() {
    return `
    Daddos Maestra:\n
      Nome: ${this.fullName}\n
      Dia nascimento: ${this.birthDate} ${this.birthTime}\n
      Local nascimento: ${this.birthPlace}
    `;
  }
}
