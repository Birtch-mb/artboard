import { IsUUID } from 'class-validator';

export class AssignTagDto {
    @IsUUID(4)
    tagId: string;
}
