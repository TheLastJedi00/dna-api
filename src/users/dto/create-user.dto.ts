import { IsEmail, IsString, ValidateNested } from 'class-validator';

export class UserLoginDto {
    @IsEmail()
    email!: string;
    @IsString()
    password!: string
    @IsString()
    role!: string[]
}

export class CreateUserDto {
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