import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateVisibilityDto {
  @IsOptional()
  @IsBoolean()
  showScript?: boolean;

  @IsOptional()
  @IsBoolean()
  showSchedule?: boolean;

  @IsOptional()
  @IsBoolean()
  showSets?: boolean;

  @IsOptional()
  @IsBoolean()
  showAssets?: boolean;

  @IsOptional()
  @IsBoolean()
  showLocations?: boolean;

  @IsOptional()
  @IsBoolean()
  showBudget?: boolean;
}
