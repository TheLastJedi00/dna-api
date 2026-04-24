import { PartialType } from '@nestjs/mapped-types';
import { CreateHumanDesignDto } from './create-human-design.dto';

export class UpdateHumanDesignDto extends PartialType(CreateHumanDesignDto) {}
