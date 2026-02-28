import { IsString, IsOptional } from 'class-validator';

export class AssignCharacterAssetDto {
    @IsString()
    assetId: string;

    @IsOptional()
    @IsString()
    setId?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
