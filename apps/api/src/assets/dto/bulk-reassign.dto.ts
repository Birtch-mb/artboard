import { IsEnum, IsOptional, IsArray, IsUUID, ArrayMinSize } from 'class-validator';
import { AssetDepartment, AssetSubDepartment } from '../../common/types';

export class BulkReassignDto {
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID(4, { each: true })
    ids: string[];

    @IsEnum(AssetDepartment)
    department: AssetDepartment;

    @IsEnum(AssetSubDepartment)
    @IsOptional()
    subDepartment?: AssetSubDepartment;
}
