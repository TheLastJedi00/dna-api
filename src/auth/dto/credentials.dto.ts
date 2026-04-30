import { IsEmail, IsString } from "class-validator";

export class CreateAuthDto {
    @IsEmail({},{message: "Formato de Email Inválido"})
    email!: string;
    @IsString()
    password!: string;
}
