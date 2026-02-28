import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCharacterDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    height?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
