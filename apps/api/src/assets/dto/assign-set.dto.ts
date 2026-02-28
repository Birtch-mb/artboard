import { IsUUID } from 'class-validator';

export class AssignSetDto {
    @IsUUID(4)
    setId: string;
}
