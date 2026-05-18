import { PartialType } from '@nestjs/mapped-types';
import { CreateNumerologyDto } from './create-numerology.dto';

export class UpdateNumerologyDto extends PartialType(CreateNumerologyDto) {}
