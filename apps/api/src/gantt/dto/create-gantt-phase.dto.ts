import { IsString, IsNotEmpty, IsInt, IsOptional, MaxLength, Matches } from 'class-validator';

export class CreateGanttPhaseDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex code (e.g. #FF0000)' })
    color: string;

    @IsInt()
    @IsOptional()
    sortOrder?: number;
}
