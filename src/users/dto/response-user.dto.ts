import { IsString } from "class-validator";

export class ResponseUserDto {
  @IsString()
  fullName!: string;
  @IsString()
  birthDate!: string;
  @IsString()
  birthTime!: string;
  @IsString()
  birthPlace!: string;
}