import { IsUUID, IsOptional, IsString } from 'class-validator';

export class AssignSetDto {
    @IsString()
    @IsUUID(4)
    @IsOptional()
    setId: string | null;
}
