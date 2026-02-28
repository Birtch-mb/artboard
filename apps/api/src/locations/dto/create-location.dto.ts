import { IsString, IsEnum, IsOptional, MaxLength, IsNumber, Min, Max } from 'class-validator';
import { LocationType } from '@prisma/client';

export class CreateLocationDto {
    @IsString()
    @MaxLength(200)
    name: string;

    @IsEnum(LocationType)
    type: LocationType;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;

    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;

    @IsOptional()
    @IsString()
    notes?: string;
}
