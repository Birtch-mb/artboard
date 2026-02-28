import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ProductionStatus } from '../../common/types';

export class UpdateProductionDto {
  @IsOptional()
  @IsString()
  name?: string;

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
