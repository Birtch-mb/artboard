import { IsUUID, IsOptional, IsString } from 'class-validator';

export class AssignLocationDto {
    @IsString()
    @IsUUID(4)
    @IsOptional()
    locationId: string | null;
}
