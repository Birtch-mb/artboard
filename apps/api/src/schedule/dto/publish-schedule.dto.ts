import { IsString, IsNotEmpty } from 'class-validator';

export class PublishScheduleDto {
    @IsString()
    @IsNotEmpty()
    versionLabel: string;
}
