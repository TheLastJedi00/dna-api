import { IsString } from 'class-validator';

export class RequestDto {
  @IsString()
  content!: string;
}
