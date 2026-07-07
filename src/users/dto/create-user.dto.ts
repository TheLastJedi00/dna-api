import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UserLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class CreateUserDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserLoginDto)
  login?: UserLoginDto;

  @IsString()
  @IsNotEmpty()
  birthDate!: string;

  @IsString()
  @IsNotEmpty()
  birthTime!: string;

  @IsString()
  @IsNotEmpty()
  birthPlace!: string;
}
