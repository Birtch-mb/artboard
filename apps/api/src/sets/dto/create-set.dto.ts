import { IsString, IsOptional, MaxLength, IsEnum, IsUUID } from 'class-validator';
import { SetStatus } from '@prisma/client';

export class CreateSetDto {
    @IsString()
    @MaxLength(200)
    name: string;

    @IsOptional()
    @IsUUID()
    parentSetId?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsEnum(SetStatus)
    status?: SetStatus;
}
