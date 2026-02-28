import { IsString, IsIn } from 'class-validator';

export class UploadFileBodyDto {
    @IsString()
    @IsIn(['PICTURE', 'DRAWING'])
    fileType: 'PICTURE' | 'DRAWING';
}
