import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthDto } from './credentials.dto';

export class UpdateAuthDto extends PartialType(CreateAuthDto) {}
