import { IsString, MaxLength, IsEnum, IsOptional, IsNumber, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { IntExt, TimeOfDay } from '@prisma/client';

export class CreateSceneDto {
    @IsString()
    @MaxLength(20)
    sceneNumber: string;

    @IsEnum(IntExt)
    intExt: IntExt;

    @IsString()
    @MaxLength(500)
    scriptedLocationName: string;

    @IsEnum(TimeOfDay)
    timeOfDay: TimeOfDay;

    @IsString()
    @IsOptional()
    synopsis?: string;

    @IsNumber()
    @Min(0)
    @Max(99)
    @IsOptional()
    @Type(() => Number)
    pageCount?: number;

    @IsUUID(4)
    @IsOptional()
    setId?: string;

    @IsString()
    @IsOptional()
    sceneText?: string;
}
