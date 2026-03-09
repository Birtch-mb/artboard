import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Delete,
    Param,
    HttpCode,
    HttpStatus,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    Logger,
    InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ScriptsService } from './scripts.service';
import { UploadScriptDto } from './dto/upload-script.dto';
import { UpdateScriptDto } from './dto/update-script.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import 'multer';

@Controller('productions/:productionId')
@UseGuards(JwtAuthGuard, ProductionMemberGuard, RolesGuard)
export class ScriptsController {
    private readonly logger = new Logger(ScriptsController.name);

    constructor(private readonly scriptsService: ScriptsService) { }

    @Post('scripts')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    @UseInterceptors(FileInterceptor('file'))
    async uploadScript(
        @Param('productionId') productionId: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
                    new FileTypeValidator({ fileType: /pdf$/ }),
                ],
            }),
        )
        file: Express.Multer.File,
        @Body() dto: UploadScriptDto,
        @CurrentUser() user: any,
    ) {
        try {
            return await this.scriptsService.uploadScript(productionId, file, dto.versionLabel, user.sub);
        } catch (error: any) {
            this.logger.error(`Script upload failed: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Upload failed');
        }
    }

    @Get('scripts')
    listScripts(@Param('productionId') productionId: string) {
        return this.scriptsService.listScripts(productionId);
    }

    // Declare specific sub-paths before /:scriptId to avoid routing conflicts

    @Post('scripts/:scriptId/reparse-numbers')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    @HttpCode(HttpStatus.OK)
    reparseSceneNumbers(
        @Param('productionId') productionId: string,
        @Param('scriptId') scriptId: string,
    ) {
        return this.scriptsService.reparseSceneNumbers(productionId, scriptId);
    }

    @Get('scripts/:scriptId/url')
    getScriptUrl(
        @Param('productionId') productionId: string,
        @Param('scriptId') scriptId: string,
    ) {
        return this.scriptsService.getScriptUrl(productionId, scriptId);
    }

    @Get('scripts/:scriptId')
    getScript(
        @Param('productionId') productionId: string,
        @Param('scriptId') scriptId: string,
    ) {
        return this.scriptsService.getScript(productionId, scriptId);
    }

    @Patch('scripts/:scriptId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    updateScript(
        @Param('productionId') productionId: string,
        @Param('scriptId') scriptId: string,
        @Body() dto: UpdateScriptDto,
    ) {
        return this.scriptsService.updateScript(productionId, scriptId, dto);
    }

    @Delete('scripts/:scriptId')
    @Roles(Role.ART_DIRECTOR)
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteScript(
        @Param('productionId') productionId: string,
        @Param('scriptId') scriptId: string,
    ) {
        return this.scriptsService.deleteScript(productionId, scriptId);
    }
}
