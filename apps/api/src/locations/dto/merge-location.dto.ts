import { IsString } from 'class-validator';

export class MergeLocationDto {
    @IsString()
    mergeFromId: string;
}
