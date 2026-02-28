import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateCharacterDto {
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    height?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
