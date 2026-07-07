import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreatePromptDto {
  @IsString()
  @IsNotEmpty()
  pillar!: string;

  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsString()
  @IsNotEmpty()
  prompt!: string;
}

export class CreatePromptsBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreatePromptDto)
  prompts!: CreatePromptDto[];
}
