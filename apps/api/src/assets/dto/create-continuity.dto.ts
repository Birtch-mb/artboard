import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ContinuityState } from '@prisma/client';

export class CreateContinuityDto {
    @IsString()
    @MaxLength(20)
    sceneNumber: string;

    @IsEnum(ContinuityState)
    state: ContinuityState;

    @IsString()
    @IsOptional()
    notes?: string;
}
