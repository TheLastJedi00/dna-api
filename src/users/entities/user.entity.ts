import { CreateUserDto } from '../dto/create-user.dto';

export class User {
  id!: string;
  fullName!: string;
  birthDate!: string;
  birthTime!: string;
  birthPlace!: string;
  isActive!: boolean;

  constructor(data: Partial<User>, id: string) {
    this.id = id
    this.isActive = true;
    if(data){
      Object.assign(User, data)
    }
  }

  disable(){
    this.isActive = false
  }

  createDtoToEntity(dto: CreateUserDto, id: string){
    this.id = id;
    this.fullName = dto.fullName;
    this.birthDate = dto.birthDate;
    this.birthTime = dto.birthTime;
    this.birthPlace = dto.birthPlace;
  }

  toUserDataPrompt(){
    return `
    Daddos Maestra:\n
      Nome: ${this.fullName}\n
      Dia nascimento: ${this.birthDate} ${this.birthTime}\n
      Local nascimento: ${this.birthPlace}
    `
  }

}
