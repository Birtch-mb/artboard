import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserMeDto {
    @IsOptional()
    @IsBoolean()
    showScriptDeletions?: boolean;
}
