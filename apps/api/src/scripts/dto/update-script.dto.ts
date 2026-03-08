import { IsString, MaxLength, IsOptional, IsEnum, IsBoolean, Matches, ValidateIf } from 'class-validator';
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

    @IsOptional()
    @ValidateIf((o) => o.watermarkName !== null)
    @IsString()
    @MaxLength(100)
    @Matches(/^[^<>]*$/, { message: 'watermarkName must not contain HTML tags' })
    watermarkName?: string | null;
}
