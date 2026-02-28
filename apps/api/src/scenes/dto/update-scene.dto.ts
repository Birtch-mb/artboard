import { IsString, MaxLength, IsEnum, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { IntExt, TimeOfDay, ChangeFlag, WizardStatus } from '@prisma/client';

export class UpdateSceneDto {
    @IsString()
    @MaxLength(20)
    @IsOptional()
    sceneNumber?: string;

    @IsEnum(IntExt)
    @IsOptional()
    intExt?: IntExt;

    @IsString()
    @MaxLength(500)
    @IsOptional()
    scriptedLocationName?: string;

    @IsEnum(TimeOfDay)
    @IsOptional()
    timeOfDay?: TimeOfDay;

    @IsString()
    @IsOptional()
    synopsis?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsNumber()
    @Min(0)
    @Max(99)
    @IsOptional()
    @Type(() => Number)
    pageCount?: number;

    @IsEnum(ChangeFlag)
    @IsOptional()
    changeFlag?: ChangeFlag;

    @IsBoolean()
    @IsOptional()
    changeReviewed?: boolean;

    @IsEnum(WizardStatus)
    @IsOptional()
    wizardStatus?: WizardStatus;

    @IsString()
    @IsOptional()
    sceneText?: string;
}
