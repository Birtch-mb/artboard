import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { SetsService } from './sets.service';
import { CreateSetDto } from './dto/create-set.dto';
import { UpdateSetDto } from './dto/update-set.dto';
import { AssignLocationDto } from './dto/assign-location.dto';
import { AddAliasDto } from './dto/add-alias.dto';
import { AssignPhaseDto } from './dto/assign-phase.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SetStatus, FileCategory, PhotoCategory } from '@prisma/client';
import { Role } from '../common/types';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('productions/:productionId/sets')
@UseGuards(JwtAuthGuard, ProductionMemberGuard, RolesGuard)
export class SetsController {
    constructor(private readonly setsService: SetsService) { }

    @Post()
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    create(@Param('productionId') productionId: string, @Body() createSetDto: CreateSetDto, @CurrentUser() user?: any) {
        return this.setsService.create(productionId, createSetDto, user?.sub);
    }

    @Get()
    findAll(
        @Param('productionId') productionId: string,
        @Query('topLevelOnly') topLevelOnly?: string,
        @Query('status') status?: SetStatus,
        @Query('locationId') locationId?: string,
    ) {
        return this.setsService.findAll(productionId, topLevelOnly === 'true', status, locationId);
    }

    @Get(':id')
    findOne(@Param('productionId') productionId: string, @Param('id') id: string) {
        return this.setsService.findOne(productionId, id);
    }

    @Patch(':id')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    update(@Param('productionId') productionId: string, @Param('id') id: string, @Body() updateSetDto: UpdateSetDto, @CurrentUser() user?: any) {
        return this.setsService.update(productionId, id, updateSetDto, user?.sub);
    }

    @Delete(':id')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    remove(@Param('productionId') productionId: string, @Param('id') id: string, @CurrentUser() user?: any) {
        return this.setsService.softDelete(productionId, id, user?.sub);
    }

    @Post(':id/aliases')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    addAlias(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Body() addAliasDto: AddAliasDto,
    ) {
        return this.setsService.addAlias(productionId, id, addAliasDto.alias);
    }

    @Delete(':id/aliases')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    removeAlias(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Body() addAliasDto: AddAliasDto,
    ) {
        return this.setsService.removeAlias(productionId, id, addAliasDto.alias);
    }

    @Post(':id/locations')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    assignLocation(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Body() assignLocationDto: AssignLocationDto
    ) {
        return this.setsService.assignLocation(productionId, id, assignLocationDto);
    }

    @Delete(':id/locations/:locationId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    removeLocation(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Param('locationId') locationId: string
    ) {
        return this.setsService.removeLocation(productionId, id, locationId);
    }

    @Post(':id/files')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    @UseInterceptors(FileInterceptor('file'))
    uploadFile(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @CurrentUser() user: any,
        @UploadedFile() file: Express.Multer.File,
        @Body('fileType') fileType: FileCategory,
        @Body('photoCategory') photoCategory?: PhotoCategory
    ) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        // Set 25MB max size checking
        if (file.size > 25 * 1024 * 1024) {
            throw new BadRequestException('File size exceeds the 25MB limit');
        }

        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException('Invalid file type. Only jpeg, png, webp, and pdf are allowed.');
        }

        return this.setsService.uploadFile(productionId, id, user.sub, file, fileType, photoCategory);
    }

    @Get(':id/files')
    findFiles(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Query('fileType') fileType?: FileCategory
    ) {
        return this.setsService.findFiles(productionId, id, fileType);
    }

    @Delete(':id/files/:fileId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    deleteFile(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Param('fileId') fileId: string
    ) {
        return this.setsService.deleteFile(productionId, id, fileId);
    }

    @Get(':id/files/:fileId/url')
    getFileUrl(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Param('fileId') fileId: string
    ) {
        return this.setsService.getFileUrl(productionId, id, fileId);
    }

    @Post(':id/phases')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    assignPhase(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Body() assignPhaseDto: AssignPhaseDto
    ) {
        return this.setsService.assignPhase(productionId, id, assignPhaseDto);
    }

    @Delete(':id/phases/:phaseId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.SET_DECORATOR)
    removePhase(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Param('phaseId') phaseId: string
    ) {
        return this.setsService.removePhase(productionId, id, phaseId);
    }
}
