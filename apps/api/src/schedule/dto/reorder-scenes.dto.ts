import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class ReorderScenesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  sceneIds: string[];
}
