import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
} from '@nestjs/common';
import { ScenesService } from './scenes.service';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { SplitSceneDto } from './dto/split-scene.dto';
import { AssignSetDto } from './dto/assign-set.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { ReviewSceneDto } from './dto/review-scene.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, JwtPayload } from '../common/types';

@Controller('productions/:productionId')
@UseGuards(JwtAuthGuard, ProductionMemberGuard, RolesGuard)
export class ScenesController {
    constructor(private readonly scenesService: ScenesService) { }

    // --- Scene CRUD via scriptId ---

    @Post('scripts/:scriptId/scenes')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    createScene(
        @Param('productionId') productionId: string,
        @Param('scriptId') scriptId: string,
        @Body() dto: CreateSceneDto,
    ) {
        return this.scenesService.createScene(productionId, scriptId, dto);
    }

    @Get('scripts/:scriptId/scenes')
    listScenes(
        @Param('productionId') productionId: string,
        @Param('scriptId') scriptId: string,
        @Query('changeFlag') changeFlag?: string,
        @Query('setId') setId?: string,
    ) {
        return this.scenesService.listScenes(productionId, scriptId, { changeFlag, setId });
    }

    // --- Scene operations via sceneId ---

    @Get('scenes/:sceneId')
    getScene(
        @Param('productionId') productionId: string,
        @Param('sceneId') sceneId: string,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.scenesService.getScene(productionId, sceneId, user.sub);
    }

    @Patch('scenes/:sceneId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    updateScene(
        @Param('productionId') productionId: string,
        @Param('sceneId') sceneId: string,
        @Body() dto: UpdateSceneDto,
    ) {
        return this.scenesService.updateScene(productionId, sceneId, dto);
    }

    @Delete('scenes/:sceneId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    deleteScene(
        @Param('productionId') productionId: string,
        @Param('sceneId') sceneId: string,
    ) {
        return this.scenesService.deleteScene(productionId, sceneId);
    }

    @Patch('scenes/:sceneId/review')
    @Roles(Role.ART_DIRECTOR)
    reviewScene(
        @Param('productionId') productionId: string,
        @Param('sceneId') sceneId: string,
        @Body() dto: ReviewSceneDto,
    ) {
        return this.scenesService.reviewScene(productionId, sceneId, dto.changeReviewed);
    }

    @Post('scenes/:sceneId/split')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    splitScene(
        @Param('productionId') productionId: string,
        @Param('sceneId') sceneId: string,
        @Body() dto: SplitSceneDto,
    ) {
        return this.scenesService.splitScene(productionId, sceneId, dto);
    }

    @Patch('scenes/:sceneId/set')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    assignSet(
        @Param('productionId') productionId: string,
        @Param('sceneId') sceneId: string,
        @Body() dto: AssignSetDto,
    ) {
        return this.scenesService.assignSet(productionId, sceneId, dto.setId ?? null);
    }

    @Post('scenes/:sceneId/assets')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    assignAsset(
        @Param('productionId') productionId: string,
        @Param('sceneId') sceneId: string,
        @Body() dto: AssignAssetDto,
    ) {
        return this.scenesService.assignAsset(productionId, sceneId, dto.assetId);
    }

    @Delete('scenes/:sceneId/assets/:assetId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    removeAsset(
        @Param('productionId') productionId: string,
        @Param('sceneId') sceneId: string,
        @Param('assetId') assetId: string,
    ) {
        return this.scenesService.removeAsset(productionId, sceneId, assetId);
    }

    @Post('scenes/:sceneId/characters')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    assignCharacter(
        @Param('productionId') productionId: string,
        @Param('sceneId') sceneId: string,
        @Body() body: { characterId: string },
    ) {
        return this.scenesService.assignCharacter(productionId, sceneId, body.characterId);
    }

    @Delete('scenes/:sceneId/characters/:characterId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    removeCharacter(
        @Param('productionId') productionId: string,
        @Param('sceneId') sceneId: string,
        @Param('characterId') characterId: string,
    ) {
        return this.scenesService.removeCharacter(productionId, sceneId, characterId);
    }
}
