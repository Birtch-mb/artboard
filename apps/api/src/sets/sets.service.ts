import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ActivityService } from '../activity/activity.service';
import { CreateSetDto } from './dto/create-set.dto';
import { UpdateSetDto } from './dto/update-set.dto';
import { AssignLocationDto } from './dto/assign-location.dto';
import { SetStatus, FileCategory, PhotoCategory } from '@prisma/client';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SetsService {
    constructor(
        private prisma: PrismaService,
        private storageService: StorageService,
        private activity: ActivityService,
    ) { }

    async create(productionId: string, createSetDto: CreateSetDto, actorId?: string) {
        let level = 1;
        let parentLocationsToCascade: any[] = [];

        if (createSetDto.parentSetId) {
            const parent = await this.prisma.set.findUnique({
                where: { id: createSetDto.parentSetId, productionId },
                include: { locations: true }
            });

            if (!parent) {
                throw new BadRequestException('Parent set not found or does not belong to this production.');
            }

            if (parent.level >= 3) {
                throw new BadRequestException('Sets support a maximum of 3 levels of nesting. Cannot add a child to a level 3 set.');
            }

            level = parent.level + 1;
            parentLocationsToCascade = parent.locations.map(sl => ({
                locationId: sl.locationId
            }));
        }

        if (createSetDto.status && createSetDto.status !== SetStatus.IDEATION && parentLocationsToCascade.length === 0) {
            throw new BadRequestException('A new set without locations must start in IDEATION status.');
        }

        const set = await this.prisma.set.create({
            data: {
                ...createSetDto,
                productionId,
                level,
                locations: parentLocationsToCascade.length > 0 ? {
                    create: parentLocationsToCascade
                } : undefined
            },
            include: {
                _count: { select: { children: true, locations: true, files: true } }
            }
        });

        if (actorId) {
            await this.activity.log({
                productionId,
                entityType: 'SET',
                entityId: set.id,
                entityName: set.name,
                action: 'CREATED',
                actorId,
            }).catch(() => {});
        }

        return set;
    }

    async findAll(productionId: string, topLevelOnly?: boolean, status?: SetStatus, locationId?: string) {
        const where: any = {
            productionId,
            deletedAt: null,
        };

        if (topLevelOnly) {
            where.parentSetId = null;
        }

        if (status) {
            where.status = status;
        }

        if (locationId) {
            // Find all sets that are assigned to this location
            where.locations = {
                some: {
                    locationId,
                },
            };
        }

        return this.prisma.set.findMany({
            where,
            include: {
                locations: {
                    include: { location: { select: { id: true, name: true } } },
                },
                children: {
                    where: { deletedAt: null },
                    include: {
                        ganttPhases: { include: { phase: true }, orderBy: { startDate: 'asc' } },
                        _count: {
                            select: { children: { where: { deletedAt: null } }, locations: true }
                        }
                    }
                },
                ganttPhases: { include: { phase: true }, orderBy: { startDate: 'asc' } },
                _count: {
                    select: {
                        children: { where: { deletedAt: null } },
                        locations: true,
                        files: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(productionId: string, id: string): Promise<any> {
        const set = await this.prisma.set.findFirst({
            where: { id, productionId, deletedAt: null },
            include: {
                parent: {
                    select: { id: true, name: true, level: true },
                },
                children: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        name: true,
                        level: true,
                        status: true,
                        _count: {
                            select: { locations: true, children: { where: { deletedAt: null } } },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                locations: {
                    include: {
                        location: {
                            select: { id: true, name: true, type: true },
                        },
                    },
                },
                files: {
                    select: { id: true, filename: true, mimeType: true, size: true, fileType: true, photoCategory: true, uploadedAt: true },
                    orderBy: { uploadedAt: 'desc' },
                },
                ganttPhases: { include: { phase: true }, orderBy: { startDate: 'asc' } },
                _count: {
                    select: { children: { where: { deletedAt: null } }, locations: true, files: true },
                },
            },
        });

        if (!set) {
            throw new NotFoundException(`Set with ID ${id} not found`);
        }

        // Map the locations array to match the requested response shape closely.
        return {
            ...set,
            locations: set.locations.map((sl) => sl.location),
            children: set.children.map((child) => ({
                ...child,
                locationCount: child._count.locations,
                childCount: child._count.children,
            })),
        };
    }

    async update(productionId: string, id: string, updateSetDto: UpdateSetDto, actorId?: string) {
        const set = await this.prisma.set.findFirst({
            where: { id, productionId, deletedAt: null },
            include: {
                _count: { select: { locations: true } },
            }
        });

        if (!set) {
            throw new NotFoundException(`Set with ID ${id} not found`);
        }

        if (updateSetDto.status && updateSetDto.status !== SetStatus.IDEATION && set._count.locations === 0) {
            throw new BadRequestException('Cannot change status from IDEATION unless at least one location is assigned.');
        }

        const updated = await this.prisma.set.update({
            where: { id },
            data: updateSetDto,
            include: {
                _count: { select: { children: true, locations: true, files: true } }
            }
        });

        if (actorId) {
            const isStatusChange = updateSetDto.status !== undefined && updateSetDto.status !== set.status;
            await this.activity.log({
                productionId,
                entityType: 'SET',
                entityId: id,
                entityName: updated.name,
                action: isStatusChange ? 'STATUS_CHANGED' : 'UPDATED',
                actorId,
                metadata: isStatusChange
                    ? { oldStatus: set.status, newStatus: updateSetDto.status }
                    : undefined,
            }).catch(() => {});
        }

        return updated;
    }

    async softDelete(productionId: string, id: string, actorId?: string) {
        const set = await this.prisma.set.findFirst({
            where: { id, productionId, deletedAt: null },
            include: {
                _count: { select: { children: { where: { deletedAt: null } } } },
            }
        });

        if (!set) {
            throw new NotFoundException(`Set with ID ${id} not found`);
        }

        if (set._count.children > 0) {
            throw new BadRequestException('Cannot delete a set that has active child sets. Delete the children first.');
        }

        const result = await this.prisma.set.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        if (actorId) {
            await this.activity.log({
                productionId,
                entityType: 'SET',
                entityId: id,
                entityName: set.name,
                action: 'DELETED',
                actorId,
            }).catch(() => {});
        }

        return result;
    }

    async addAlias(productionId: string, setId: string, alias: string): Promise<any> {
        const set = await this.prisma.set.findFirst({
            where: { id: setId, productionId, deletedAt: null },
        });
        if (!set) throw new NotFoundException(`Set ${setId} not found`);
        if (set.scriptedAliases.includes(alias)) {
            throw new BadRequestException('Alias already exists for this set');
        }
        return this.prisma.set.update({
            where: { id: set.id },
            data: { scriptedAliases: { push: alias } },
            select: { id: true, scriptedAliases: true },
        });
    }

    async removeAlias(productionId: string, setId: string, alias: string): Promise<any> {
        const set = await this.prisma.set.findFirst({
            where: { id: setId, productionId, deletedAt: null },
        });
        if (!set) throw new NotFoundException(`Set ${setId} not found`);
        return this.prisma.set.update({
            where: { id: set.id },
            data: { scriptedAliases: { set: set.scriptedAliases.filter((a) => a !== alias) } },
            select: { id: true, scriptedAliases: true },
        });
    }

    async assignLocation(productionId: string, setId: string, assignLocationDto: AssignLocationDto) {
        const set = await this.prisma.set.findFirst({
            where: { id: setId, productionId, deletedAt: null },
        });

        if (!set) {
            throw new NotFoundException(`Set with ID ${setId} not found`);
        }

        const location = await this.prisma.location.findFirst({
            where: { id: assignLocationDto.locationId, productionId, deletedAt: null },
        });

        if (!location) {
            throw new BadRequestException('Location not found in this production.');
        }

        try {
            return await this.prisma.setLocation.create({
                data: {
                    setId,
                    locationId: assignLocationDto.locationId,
                },
                include: {
                    location: true
                }
            });
        } catch (error) {
            throw new BadRequestException('This location is already assigned to this set.');
        }
    }

    async removeLocation(productionId: string, setId: string, locationId: string) {
        const set = await this.prisma.set.findFirst({
            where: { id: setId, productionId, deletedAt: null },
            include: {
                _count: { select: { locations: true } },
            },
        });

        if (!set) {
            throw new NotFoundException(`Set with ID ${setId} not found`);
        }

        if (set.status !== SetStatus.IDEATION && set._count.locations <= 1) {
            throw new BadRequestException('Cannot remove the last location from a set unless its status is IDEATION.');
        }

        const setLocation = await this.prisma.setLocation.findUnique({
            where: {
                setId_locationId: {
                    setId,
                    locationId,
                },
            },
        });

        if (!setLocation) {
            throw new NotFoundException('Location is not assigned to this set.');
        }

        await this.prisma.setLocation.delete({
            where: { id: setLocation.id },
        });

        return { success: true };
    }

    async uploadFile(
        productionId: string,
        setId: string,
        userId: string,
        file: Express.Multer.File,
        fileType: FileCategory,
        photoCategory?: PhotoCategory
    ) {
        const set = await this.prisma.set.findFirst({
            where: { id: setId, productionId, deletedAt: null },
        });

        if (!set) {
            throw new NotFoundException(`Set with ID ${setId} not found`);
        }

        if (fileType === FileCategory.PICTURE && !photoCategory) {
            throw new BadRequestException('photoCategory is required when fileType is PICTURE');
        }

        const ext = path.extname(file.originalname);
        const storageKey = `productions/${productionId}/sets/${setId}/${uuidv4()}${ext}`;

        try {
            await this.prisma.setFile.create({
                data: {
                    setId,
                    fileType,
                    photoCategory: fileType === FileCategory.PICTURE ? photoCategory : null,
                    filename: file.originalname,
                    storageKey,
                    mimeType: file.mimetype,
                    size: file.size,
                    uploadedBy: userId,
                }
            });

            const presignedUploadUrl = await this.storageService.getPresignedPutUrl(storageKey, 15 * 60);

            return { presignedUploadUrl, storageKey };
        } catch (e: any) {
            throw new BadRequestException('UPLOAD_ERROR: ' + e.message + '\n' + e.stack);
        }
    }

    async findFiles(productionId: string, setId: string, fileType?: FileCategory) {
        const set = await this.prisma.set.findFirst({
            where: { id: setId, productionId, deletedAt: null },
        });

        if (!set) {
            throw new NotFoundException(`Set with ID ${setId} not found`);
        }

        return this.prisma.setFile.findMany({
            where: {
                setId,
                ...(fileType ? { fileType } : {})
            },
            orderBy: { uploadedAt: 'desc' }
        });
    }

    async getFileUrl(productionId: string, setId: string, fileId: string) {
        const file = await this.prisma.setFile.findFirst({
            where: { id: fileId, setId, set: { productionId } },
        });

        if (!file) {
            throw new NotFoundException(`File with ID ${fileId} not found`);
        }

        const url = await this.storageService.getPresignedGetUrl(file.storageKey, 15 * 60);

        return { url };
    }

    async deleteFile(productionId: string, setId: string, fileId: string) {
        const file = await this.prisma.setFile.findFirst({
            where: { id: fileId, setId, set: { productionId } },
        });

        if (!file) {
            throw new NotFoundException(`File with ID ${fileId} not found`);
        }

        await this.storageService.deleteObject(file.storageKey);

        await this.prisma.setFile.delete({
            where: { id: fileId }
        });

        return { success: true };
    }

    async assignPhase(productionId: string, setId: string, assignPhaseDto: any) {
        const set = await this.prisma.set.findFirst({
            where: { id: setId, productionId, deletedAt: null },
        });

        if (!set) throw new NotFoundException(`Set with ID ${setId} not found`);

        const phase = await this.prisma.ganttPhase.findFirst({
            where: { id: assignPhaseDto.phaseId, productionId },
        });

        if (!phase) throw new BadRequestException('Gantt Phase not found in this production.');

        // If a phase is assigned multiple times to the same set it will update the dates
        return this.prisma.setPhase.upsert({
            where: {
                setId_phaseId: {
                    setId,
                    phaseId: assignPhaseDto.phaseId,
                }
            },
            update: {
                startDate: new Date(assignPhaseDto.startDate),
                endDate: new Date(assignPhaseDto.endDate),
                notes: assignPhaseDto.notes,
            },
            create: {
                setId,
                phaseId: assignPhaseDto.phaseId,
                startDate: new Date(assignPhaseDto.startDate),
                endDate: new Date(assignPhaseDto.endDate),
                notes: assignPhaseDto.notes,
            },
            include: { phase: true }
        });
    }

    async removePhase(productionId: string, setId: string, phaseId: string) {
        const set = await this.prisma.set.findFirst({
            where: { id: setId, productionId, deletedAt: null },
        });

        if (!set) throw new NotFoundException(`Set with ID ${setId} not found`);

        const setPhase = await this.prisma.setPhase.findUnique({
            where: { setId_phaseId: { setId, phaseId } }
        });

        if (!setPhase) throw new NotFoundException('This phase is not assigned to this set.');

        await this.prisma.setPhase.delete({
            where: { id: setPhase.id }
        });

        return { success: true };
    }
}
