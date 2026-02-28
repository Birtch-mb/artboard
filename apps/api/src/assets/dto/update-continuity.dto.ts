import { PartialType } from '@nestjs/mapped-types';
import { CreateContinuityDto } from './create-continuity.dto';

export class UpdateContinuityDto extends PartialType(CreateContinuityDto) { }
