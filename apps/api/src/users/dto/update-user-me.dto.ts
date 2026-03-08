import {
    IsBoolean,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    ValidateIf,
} from 'class-validator';

export class UpdateUserMeDto {
    @IsOptional()
    @ValidateIf((o) => o.watermarkName !== null)
    @IsString()
    @MaxLength(100)
    @Matches(/^[^<>]*$/, { message: 'watermarkName must not contain HTML tags' })
    watermarkName?: string | null;

    @IsOptional()
    @IsBoolean()
    showScriptDeletions?: boolean;
}
