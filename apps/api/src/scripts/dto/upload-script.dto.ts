import { IsString, MaxLength } from 'class-validator';

export class UploadScriptDto {
    @IsString()
    @MaxLength(100)
    versionLabel: string;
}
