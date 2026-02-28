import { PartialType } from '@nestjs/mapped-types';
import { CreateSetDto } from './create-set.dto';
import { SetStatus } from '@prisma/client';
import { IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';

export class UpdateSetDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    name?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsEnum(SetStatus)
    status?: SetStatus;
}
