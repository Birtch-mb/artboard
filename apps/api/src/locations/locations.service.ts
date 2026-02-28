import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { v4 as uuidv4 } from 'uuid';
import { FileCategory } from '@prisma/client';
import 'multer';

@Injectable()
export class LocationsService {
    private readonly logger = new Logger(LocationsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly storageService: StorageService,
    ) { }

    async create(productionId: string, createLocationDto: CreateLocationDto) {
        return this.prisma.location.create({
            data: {
                ...createLocationDto,
                productionId,
            },
        });
    }

    async findAll(productionId: string) {
        return this.prisma.location.findMany({
            where: {
                productionId,
                deletedAt: null,
            },
            include: {
                _count: {
                    select: { setLocations: true, files: true },
                },
                setLocations: {
                    include: {
                        set: {
                            select: { id: true, name: true, deletedAt: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(productionId: string, id: string) {
        const location = await this.prisma.location.findFirst({
            where: {
                id,
                productionId,
                deletedAt: null,
            },
            include: {
                setLocations: {
                    include: {
                        set: {
                            select: { id: true, name: true, deletedAt: true },
                        },
                    },
                },
                files: true,
            },
        });

        if (!location) {
            throw new NotFoundException(`Location ${id} not found`);
        }

        return {
            ...location,
            sets: location.setLocations
                .filter((sl) => !sl.set.deletedAt)
                .map((sl) => sl.set),
        };
    }

    async update(productionId: string, id: string, updateLocationDto: UpdateLocationDto) {
        const location = await this.findOne(productionId, id);
        return this.prisma.location.update({
            where: { id: location.id },
            data: updateLocationDto,
        });
    }

    async remove(productionId: string, id: string) {
        const location = await this.findOne(productionId, id);
        return this.prisma.location.update({
            where: { id: location.id },
            data: { deletedAt: new Date() },
        });
    }

    async merge(productionId: string, targetId: string, sourceId: string) {
        if (targetId === sourceId) {
            throw new BadRequestException('Cannot merge a location into itself');
        }

        const targetLocation = await this.findOne(productionId, targetId);
        const sourceLocation = await this.findOne(productionId, sourceId);

        return this.prisma.$transaction(async (tx) => {
            // 1. Move sets
            const setLocationsToMove = await tx.setLocation.findMany({
                where: { locationId: sourceLocation.id }
            });

            for (const sl of setLocationsToMove) {
                try {
                    await tx.setLocation.update({
                        where: { id: sl.id },
                        data: { locationId: targetLocation.id }
                    });
                } catch (err) {
                    // Set already has target location, just delete the redundant assignment
                    await tx.setLocation.delete({ where: { id: sl.id } });
                }
            }

            // 2. Soft delete source location
            await tx.location.update({
                where: { id: sourceLocation.id },
                data: { deletedAt: new Date() },
            });

            return targetLocation;
        });
    }

    async uploadFile(productionId: string, locationId: string, file: Express.Multer.File, fileType: 'PICTURE' | 'DRAWING', userId: string) {
        // Verify location exists
        const location = await this.findOne(productionId, locationId);

        const fileId = uuidv4();
        const ext = file.originalname.split('.').pop();
        const storageKey = `productions/${productionId}/locations/${locationId}/${fileId}.${ext}`;

        await this.storageService.putObject(storageKey, file.buffer, file.mimetype);

        return this.prisma.locationFile.create({
            data: {
                id: fileId,
                locationId: location.id,
                fileType: fileType as FileCategory,
                filename: file.originalname,
                storageKey,
                mimeType: file.mimetype,
                size: file.size,
                uploadedBy: userId,
            },
        });
    }

    async listFiles(productionId: string, locationId: string) {
        const location = await this.findOne(productionId, locationId);
        return this.prisma.locationFile.findMany({
            where: { locationId: location.id },
            orderBy: { uploadedAt: 'desc' },
        });
    }

    async deleteFile(productionId: string, locationId: string, fileId: string) {
        const location = await this.findOne(productionId, locationId);

        const file = await this.prisma.locationFile.findFirst({
            where: {
                id: fileId,
                locationId: location.id,
            },
        });

        if (!file) {
            throw new NotFoundException(`File ${fileId} not found`);
        }

        await this.storageService.deleteObject(file.storageKey);

        return this.prisma.locationFile.delete({
            where: { id: file.id },
        });
    }

    async updateFile(productionId: string, locationId: string, fileId: string, data: { notes?: string }) {
        const location = await this.findOne(productionId, locationId);

        const file = await this.prisma.locationFile.findFirst({
            where: {
                id: fileId,
                locationId: location.id,
            },
        });

        if (!file) {
            throw new NotFoundException(`File ${fileId} not found`);
        }

        return this.prisma.locationFile.update({
            where: { id: file.id },
            data: {
                notes: data.notes,
            },
        });
    }

    async getFileUrl(productionId: string, locationId: string, fileId: string) {
        const location = await this.findOne(productionId, locationId);

        const file = await this.prisma.locationFile.findFirst({
            where: {
                id: fileId,
                locationId: location.id,
            },
        });

        if (!file) {
            throw new NotFoundException(`File ${fileId} not found`);
        }

        const url = await this.storageService.getPresignedGetUrl(file.storageKey, 15 * 60);

        return { url };
    }
}
