import { PartialType } from '@nestjs/mapped-types';
import { CreateDnaStatusDto } from './create-dna-status.dto';

export class UpdateDnaStatusDto extends PartialType(CreateDnaStatusDto) {}
