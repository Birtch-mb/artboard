import { IsOptional, IsString } from 'class-validator';

export class UpdateLocationFileDto {
    @IsOptional()
    @IsString()
    notes?: string;
}
