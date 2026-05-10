import { IsEmail, IsString, ValidateNested } from 'class-validator';

export class UserLoginDto {
    @IsEmail()
    email!: string;
    @IsString()
    password!: string
    @IsString()
    roles!: string[]
}

export class CreateUserDto {
  @IsString()
  id?: string;
  @IsString()
  fullName!: string;
  @ValidateNested({each: true})
  login?: UserLoginDto;
  @IsString()
  birthDate!: string;
  @IsString()
  birthTime!: string;
  @IsString()
  birthPlace!: string;
}