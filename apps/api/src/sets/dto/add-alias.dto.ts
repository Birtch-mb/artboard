import { IsString, MaxLength } from 'class-validator';

export class AddAliasDto {
    @IsString()
    @MaxLength(200)
    alias: string;
}
