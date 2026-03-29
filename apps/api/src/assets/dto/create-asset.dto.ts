import {
    IsString, IsEnum, IsOptional, IsInt, Min, IsNumber,
    IsUUID, IsArray, MaxLength, ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetStatus } from '@prisma/client';
import { AssetDepartment, AssetSubDepartment } from '../../common/types';

export class CreateAssetDto {
    @IsString()
    @MaxLength(200)
    name: string;

    @IsEnum(AssetDepartment)
    @IsOptional()
    department?: AssetDepartment;

    @IsEnum(AssetSubDepartment)
    @IsOptional()
    @ValidateIf((o) => o.subDepartment !== undefined && o.subDepartment !== null)
    subDepartment?: AssetSubDepartment;

    // Greens metadata — only meaningful when subDepartment=GREENS
    @IsString()
    @IsOptional()
    greenSpecies?: string;

    @IsString()
    @IsOptional()
    greenNursery?: string;

    @IsString()
    @IsOptional()
    greenNotes?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsString()
    @IsOptional()
    dimensions?: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    quantity?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    budgetCost?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    actualCost?: number;

    @IsString()
    @IsOptional()
    @MaxLength(200)
    sourceVendor?: string;

    @IsEnum(AssetStatus)
    @IsOptional()
    status?: AssetStatus;

    @IsArray()
    @IsUUID(4, { each: true })
    @IsOptional()
    tagIds?: string[];

    @IsArray()
    @IsUUID(4, { each: true })
    @IsOptional()
    setIds?: string[];
}
