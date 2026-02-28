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
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    Logger,
    InternalServerErrorException,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { AssignSetDto } from './dto/assign-set.dto';
import { AssignTagDto } from './dto/assign-tag.dto';
import { CreateContinuityDto } from './dto/create-continuity.dto';
import { UpdateContinuityDto } from './dto/update-continuity.dto';
import { BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';

@Controller('productions/:productionId')
@UseGuards(JwtAuthGuard, ProductionMemberGuard, RolesGuard)
export class AssetsController {
    private readonly logger = new Logger(AssetsController.name);

    constructor(private readonly assetsService: AssetsService) { }

    // --- TAGS ---
    @Get('tags')
    getTags(@Param('productionId') productionId: string) {
        return this.assetsService.getTags(productionId);
    }

    @Post('tags')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    createTag(
        @Param('productionId') productionId: string,
        @Body() dto: CreateTagDto,
    ) {
        return this.assetsService.createTag(productionId, dto.name);
    }

    @Delete('tags/:tagId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    deleteTag(
        @Param('productionId') productionId: string,
        @Param('tagId') tagId: string,
    ) {
        return this.assetsService.deleteTag(productionId, tagId);
    }

    // --- ASSETS CRUD ---
    @Post('assets')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR, Role.PROPS_MASTER)
    createAsset(
        @Param('productionId') productionId: string,
        @Body() dto: CreateAssetDto,
        @CurrentUser() user?: any,
    ) {
        return this.assetsService.createAsset(productionId, dto, user?.sub);
    }

    @Get('assets')
    findAll(
        @Param('productionId') productionId: string,
        @Query('setId') setId?: string,
        @Query('category') category?: string,
        @Query('tagIds') tagIds?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
        @CurrentUser() user?: any,
    ) {
        return this.assetsService.findAll(productionId, { setId, category, tagIds, status, search }, user);
    }

    @Get('assets/:assetId')
    findOne(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @CurrentUser() user?: any,
    ) {
        return this.assetsService.findOne(productionId, assetId, user);
    }

    @Patch('assets/:assetId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR, Role.PROPS_MASTER)
    updateAsset(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Body() dto: UpdateAssetDto,
        @CurrentUser() user?: any,
    ) {
        return this.assetsService.updateAsset(productionId, assetId, dto, user?.sub);
    }

    @Delete('assets/:assetId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    removeAsset(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @CurrentUser() user?: any,
    ) {
        return this.assetsService.removeAsset(productionId, assetId, user?.sub);
    }

    // --- ASSIGNMENTS ---
    @Post('assets/:assetId/sets')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    assignSet(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Body() dto: AssignSetDto,
    ) {
        return this.assetsService.addSet(productionId, assetId, dto.setId);
    }

    @Delete('assets/:assetId/sets/:setId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    removeSet(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Param('setId') setId: string,
    ) {
        return this.assetsService.removeSet(productionId, assetId, setId);
    }

    @Post('assets/:assetId/tags')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    assignTag(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Body() dto: AssignTagDto,
    ) {
        return this.assetsService.addTag(productionId, assetId, dto.tagId);
    }

    @Delete('assets/:assetId/tags/:tagId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    removeTagAssignment(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Param('tagId') tagId: string,
    ) {
        return this.assetsService.removeTag(productionId, assetId, tagId);
    }

    // --- FILES ---
    @Post('assets/:assetId/files')
    @UseInterceptors(FileInterceptor('file'))
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR, Role.PROPS_MASTER)
    async uploadFile(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }),
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ }),
                ],
            }),
        )
        file: Express.Multer.File,
        @CurrentUser() user: any,
    ) {
        try {
            return await this.assetsService.uploadFile(productionId, assetId, file, user.sub);
        } catch (error: any) {
            this.logger.error(`Upload failed: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Upload failed');
        }
    }

    @Get('assets/:assetId/files')
    listFiles(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
    ) {
        return this.assetsService.listFiles(productionId, assetId);
    }

    @Delete('assets/:assetId/files/:fileId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    deleteFile(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Param('fileId') fileId: string,
    ) {
        return this.assetsService.deleteFile(productionId, assetId, fileId);
    }

    @Get('assets/:assetId/files/:fileId/url')
    getFileUrl(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Param('fileId') fileId: string,
    ) {
        return this.assetsService.getFileUrl(productionId, assetId, fileId);
    }

    // --- CONTINUITY ---
    @Get('assets/:assetId/continuity')
    listContinuity(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
    ) {
        return this.assetsService.listContinuityEvents(productionId, assetId);
    }

    @Post('assets/:assetId/continuity')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    createContinuity(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Body() dto: CreateContinuityDto,
    ) {
        return this.assetsService.createContinuityEvent(productionId, assetId, dto);
    }

    @Patch('assets/:assetId/continuity/:continuityEventId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    updateContinuity(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Param('continuityEventId') continuityEventId: string,
        @Body() dto: UpdateContinuityDto,
    ) {
        return this.assetsService.updateContinuityEvent(productionId, assetId, continuityEventId, dto);
    }

    @Delete('assets/:assetId/continuity/:continuityEventId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    deleteContinuity(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Param('continuityEventId') continuityEventId: string,
    ) {
        return this.assetsService.deleteContinuityEvent(productionId, assetId, continuityEventId);
    }

    @Post('assets/:assetId/continuity/:continuityEventId/files')
    @UseInterceptors(FileInterceptor('file'))
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR, Role.PROPS_MASTER)
    async uploadContinuityFile(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Param('continuityEventId') continuityEventId: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }),
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ }),
                ],
            }),
        )
        file: Express.Multer.File,
        @CurrentUser() user: any,
    ) {
        try {
            return await this.assetsService.uploadContinuityFile(productionId, assetId, continuityEventId, file, user.sub);
        } catch (error: any) {
            this.logger.error(`Upload failed: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Upload failed');
        }
    }

    @Get('assets/:assetId/continuity/:continuityEventId/files/:fileId/url')
    getContinuityFileUrl(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Param('continuityEventId') continuityEventId: string,
        @Param('fileId') fileId: string,
    ) {
        return this.assetsService.getContinuityFileUrl(productionId, assetId, continuityEventId, fileId);
    }

    @Delete('assets/:assetId/continuity/:continuityEventId/files/:fileId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    deleteContinuityFile(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Param('continuityEventId') continuityEventId: string,
        @Param('fileId') fileId: string,
    ) {
        return this.assetsService.deleteContinuityFile(productionId, assetId, continuityEventId, fileId);
    }

    @Get('assets/:assetId/continuity/resolve')
    resolveContinuityState(
        @Param('productionId') productionId: string,
        @Param('assetId') assetId: string,
        @Query('sceneNumber') sceneNumber: string,
    ) {
        if (!sceneNumber) {
            throw new BadRequestException('sceneNumber query parameter is required');
        }
        return this.assetsService.resolveState(productionId, assetId, sceneNumber);
    }
}
