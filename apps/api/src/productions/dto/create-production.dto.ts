import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ProductionStatus } from '../../common/types';

export class CreateProductionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(ProductionStatus)
  status?: ProductionStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  wrapDate?: string;
}
