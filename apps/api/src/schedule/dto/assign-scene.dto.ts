import { IsString, IsNotEmpty } from 'class-validator';

export class AssignSceneDto {
  @IsString()
  @IsNotEmpty()
  sceneId: string;
}
