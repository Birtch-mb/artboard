import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateShootDayDto {
  @IsOptional()
  @IsDateString()
  date?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
