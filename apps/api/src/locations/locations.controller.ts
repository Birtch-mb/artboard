import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    Logger,
    InternalServerErrorException,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { MergeLocationDto } from './dto/merge-location.dto';
import { UploadFileBodyDto } from './dto/upload-file.dto';
import { UpdateLocationFileDto } from './dto/update-location-file.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/types';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import 'multer'; // Ensure Express.Multer.File is recognized

@Controller('productions/:productionId/locations')
@UseGuards(JwtAuthGuard, ProductionMemberGuard, RolesGuard)
export class LocationsController {
    private readonly logger = new Logger(LocationsController.name);

    constructor(private readonly locationsService: LocationsService) { }

    @Post()
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    create(
        @Param('productionId') productionId: string,
        @Body() createLocationDto: CreateLocationDto,
    ) {
        return this.locationsService.create(productionId, createLocationDto);
    }

    @Get()
    findAll(@Param('productionId') productionId: string) {
        return this.locationsService.findAll(productionId);
    }

    @Get(':id')
    findOne(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
    ) {
        return this.locationsService.findOne(productionId, id);
    }

    @Patch(':id')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    update(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Body() updateLocationDto: UpdateLocationDto,
    ) {
        return this.locationsService.update(productionId, id, updateLocationDto);
    }

    @Delete(':id')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    remove(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
    ) {
        return this.locationsService.remove(productionId, id);
    }

    @Post(':id/merge')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    merge(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Body() mergeLocationDto: MergeLocationDto,
    ) {
        return this.locationsService.merge(productionId, id, mergeLocationDto.mergeFromId);
    }

    @Post(':id/files')
    @UseInterceptors(FileInterceptor('file'))
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    async uploadFile(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Body() body: UploadFileBodyDto,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }),
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ }),
                ],
            }),
        ) file: Express.Multer.File,
        @CurrentUser() user: any,
    ) {
        try {
            return await this.locationsService.uploadFile(
                productionId,
                id,
                file,
                body.fileType,
                user.sub,
            );
        } catch (error: any) {
            this.logger.error(
                `Upload failed — productionId=${productionId} locationId=${id} user=${user?.sub}: ${error.message}`,
                error.stack,
            );
            throw error instanceof InternalServerErrorException
                ? error
                : new InternalServerErrorException(error.message || 'Upload failed');
        }
    }

    @Get(':id/files')
    listFiles(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
    ) {
        return this.locationsService.listFiles(productionId, id);
    }

    @Delete(':id/files/:fileId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    deleteFile(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Param('fileId') fileId: string,
    ) {
        return this.locationsService.deleteFile(productionId, id, fileId);
    }

    @Patch(':id/files/:fileId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    updateFile(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Param('fileId') fileId: string,
        @Body() updateLocationFileDto: UpdateLocationFileDto,
    ) {
        return this.locationsService.updateFile(productionId, id, fileId, updateLocationFileDto);
    }

    @Get(':id/files/:fileId/url')
    getFileUrl(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Param('fileId') fileId: string,
    ) {
        return this.locationsService.getFileUrl(productionId, id, fileId);
    }
}
