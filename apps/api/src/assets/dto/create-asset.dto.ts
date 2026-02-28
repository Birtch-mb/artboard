import { IsString, IsEnum, IsOptional, IsInt, Min, IsNumber, IsUUID, IsArray, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetCategory, AssetStatus } from '@prisma/client';

export class CreateAssetDto {
    @IsString()
    @MaxLength(200)
    name: string;

    @IsEnum(AssetCategory)
    category: AssetCategory;

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
