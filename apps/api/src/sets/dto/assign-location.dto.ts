import { IsUUID, IsNotEmpty } from 'class-validator';

export class AssignLocationDto {
    @IsUUID()
    @IsNotEmpty()
    locationId: string;
}
