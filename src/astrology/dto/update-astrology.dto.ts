import { PartialType } from '@nestjs/mapped-types';
import { CreateAstrologyDto } from './create-astrology.dto';

export class UpdateAstrologyDto extends PartialType(CreateAstrologyDto) {}
