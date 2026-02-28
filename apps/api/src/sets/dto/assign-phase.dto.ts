import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class AssignPhaseDto {
    @IsString()
    @IsNotEmpty()
    phaseId: string;

    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @IsDateString()
    @IsNotEmpty()
    endDate: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
