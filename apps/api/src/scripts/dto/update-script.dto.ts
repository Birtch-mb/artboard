import { IsString, MaxLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ReviewStatus } from '@prisma/client';

export class UpdateScriptDto {
    @IsString()
    @MaxLength(100)
    @IsOptional()
    versionLabel?: string;

    @IsEnum(ReviewStatus)
    @IsOptional()
    reviewStatus?: ReviewStatus;

    @IsBoolean()
    @IsOptional()
    wizardComplete?: boolean;
}
