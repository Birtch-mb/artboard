import { IsBoolean } from 'class-validator';

export class ReviewSceneDto {
    @IsBoolean()
    changeReviewed: boolean;
}
