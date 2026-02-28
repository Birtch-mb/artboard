import { IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateShootDayDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
