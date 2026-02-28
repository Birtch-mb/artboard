import { IsArray, ValidateNested, IsString, MaxLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class SubSceneDto {
    @IsString()
    @MaxLength(20)
    sceneNumber: string;
}

export class SplitSceneDto {
    @IsArray()
    @ArrayMinSize(2)
    @ValidateNested({ each: true })
    @Type(() => SubSceneDto)
    subScenes: SubSceneDto[];
}
