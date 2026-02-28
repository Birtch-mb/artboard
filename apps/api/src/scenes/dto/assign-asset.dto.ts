import { IsUUID } from 'class-validator';

export class AssignAssetDto {
    @IsUUID(4)
    assetId: string;
}
