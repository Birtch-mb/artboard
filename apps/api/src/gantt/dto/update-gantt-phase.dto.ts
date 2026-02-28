import { IsString, IsOptional, MaxLength, Matches, IsInt } from 'class-validator';

export class UpdateGanttPhaseDto {
    @IsString()
    @IsOptional()
    @MaxLength(50)
    name?: string;

    @IsString()
    @IsOptional()
    @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex code (e.g. #FF0000)' })
    color?: string;

    @IsInt()
    @IsOptional()
    sortOrder?: number;
}
