import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ActivityService } from '../activity/activity.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { CreateContinuityDto } from './dto/create-continuity.dto';
import { UpdateContinuityDto } from './dto/update-continuity.dto';
import { Prisma, Role } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

interface CurrentUser {
    sub: string;
    productionRole?: Role;
    permissions?: { showBudget: boolean };
}

@Injectable()
export class AssetsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly activity: ActivityService,
    ) { }

    private checkBudgetVisibility(user: CurrentUser) {
        if (user.productionRole === Role.ART_DIRECTOR || user.productionRole === Role.PRODUCTION_DESIGNER) {
            return true;
        }
        if (user.productionRole === Role.COORDINATOR && user.permissions?.showBudget) {
            return true;
        }
        return false;
    }

    // --- Tags ---
    async getTags(productionId: string) {
        return this.prisma.assetTag.findMany({
            where: { productionId },
            orderBy: { name: 'asc' },
        });
    }

    async createTag(productionId: string, name: string) {
        return this.prisma.assetTag.create({
            data: { productionId, name },
        });
    }

    async deleteTag(productionId: string, tagId: string) {
        // Delete relations first (cascade ideally, but manual to be safe)
        await this.prisma.assetTagMap.deleteMany({ where: { tagId } });
        return this.prisma.assetTag.delete({
            where: { id: tagId, productionId },
        });
    }

    // --- Assets CRUD ---
    async createAsset(productionId: string, dtos: CreateAssetDto, actorId?: string) {
        const { tagIds, setIds, ...data } = dtos;

        const asset = await this.prisma.asset.create({
            data: {
                ...data,
                productionId,
                tags: tagIds ? {
                    create: tagIds.map(tagId => ({ tagId }))
                } : undefined,
                setAssignments: setIds ? {
                    create: setIds.map(setId => ({ setId }))
                } : undefined,
            },
        });

        if (actorId) {
            await this.activity.log({
                productionId,
                entityType: 'ASSET',
                entityId: asset.id,
                entityName: asset.name,
                action: 'CREATED',
                actorId,
            }).catch(() => {}); // never block on activity logging
        }

        return asset;
    }

    async findAll(productionId: string, filters: { setId?: string, category?: string, tagIds?: string, status?: string, search?: string }, user: CurrentUser) {
        const where: Prisma.AssetWhereInput = { productionId, deletedAt: null };

        if (filters.setId) {
            where.setAssignments = { some: { setId: filters.setId } };
        }
        if (filters.category) {
            where.category = filters.category as any;
        }
        if (filters.status) {
            where.status = filters.status as any;
        }
        if (filters.search) {
            where.name = { contains: filters.search, mode: 'insensitive' };
        }
        if (filters.tagIds) {
            const tagIdList = filters.tagIds.split(',').map(id => id.trim()).filter(Boolean);
            if (tagIdList.length > 0) {
                // AND logic: must have ALL provided tags
                where.AND = tagIdList.map(tagId => ({
                    tags: { some: { tagId } }
                }));
            }
        }

        const assets = await this.prisma.asset.findMany({
            where,
            include: {
                tags: { include: { tag: true } },
                setAssignments: { include: { set: true } },
                _count: {
                    select: { setAssignments: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const canSeeBudget = this.checkBudgetVisibility(user);

        return assets.map(asset => {
            if (!canSeeBudget) {
                asset.budgetCost = null;
                asset.actualCost = null;
            }
            return {
                ...asset,
                tags: asset.tags.map(t => t.tag),
                sets: asset.setAssignments.map(s => s.set)
            };
        });
    }

    async findOne(productionId: string, assetId: string, user: CurrentUser) {
        const asset = await this.prisma.asset.findFirst({
            where: { id: assetId, productionId, deletedAt: null },
            include: {
                tags: { include: { tag: true } },
                setAssignments: { include: { set: true } },
                files: { orderBy: { uploadedAt: 'desc' } },
                continuityEvents: { orderBy: { sceneNumber: 'asc' } },
                _count: {
                    select: { tags: true, setAssignments: true, files: true, continuityEvents: true }
                }
            }
        });

        if (!asset) throw new NotFoundException('Asset not found');

        const canSeeBudget = this.checkBudgetVisibility(user);
        if (!canSeeBudget) {
            asset.budgetCost = null;
            asset.actualCost = null;
        }

        return {
            ...asset,
            tags: asset.tags.map(t => t.tag),
            sets: asset.setAssignments.map(s => s.set),
        };
    }

    async updateAsset(productionId: string, assetId: string, dto: UpdateAssetDto, actorId?: string) {
        const existing = await this.prisma.asset.findFirstOrThrow({ where: { id: assetId, productionId, deletedAt: null } });

        const { tagIds, setIds, ...data } = dto;

        const updated = await this.prisma.asset.update({
            where: { id: assetId },
            data,
        });

        if (actorId) {
            const isStatusChange = dto.status !== undefined && dto.status !== existing.status;
            await this.activity.log({
                productionId,
                entityType: 'ASSET',
                entityId: assetId,
                entityName: updated.name,
                action: isStatusChange ? 'STATUS_CHANGED' : 'UPDATED',
                actorId,
                metadata: isStatusChange
                    ? { oldStatus: existing.status, newStatus: dto.status }
                    : undefined,
            }).catch(() => {});
        }

        return updated;
    }

    async removeAsset(productionId: string, assetId: string, actorId?: string) {
        const existing = await this.prisma.asset.findFirstOrThrow({ where: { id: assetId, productionId, deletedAt: null } });
        const result = await this.prisma.asset.update({
            where: { id: assetId },
            data: { deletedAt: new Date() }
        });

        if (actorId) {
            await this.activity.log({
                productionId,
                entityType: 'ASSET',
                entityId: assetId,
                entityName: existing.name,
                action: 'DELETED',
                actorId,
            }).catch(() => {});
        }

        return result;
    }

    // --- Assignments ---
    async addSet(productionId: string, assetId: string, setId: string) {
        await this.prisma.asset.findFirstOrThrow({ where: { id: assetId, productionId, deletedAt: null } });
        await this.prisma.set.findFirstOrThrow({ where: { id: setId, productionId } });
        return this.prisma.assetSetMap.create({
            data: { assetId, setId }
        });
    }

    async removeSet(productionId: string, assetId: string, setId: string) {
        return this.prisma.assetSetMap.delete({
            where: { assetId_setId: { assetId, setId } }
        });
    }

    async addTag(productionId: string, assetId: string, tagId: string) {
        await this.prisma.asset.findFirstOrThrow({ where: { id: assetId, productionId, deletedAt: null } });
        await this.prisma.assetTag.findFirstOrThrow({ where: { id: tagId, productionId } });
        return this.prisma.assetTagMap.create({
            data: { assetId, tagId }
        });
    }

    async removeTag(productionId: string, assetId: string, tagId: string) {
        return this.prisma.assetTagMap.delete({
            where: { assetId_tagId: { assetId, tagId } }
        });
    }

    // --- Files ---
    async uploadFile(productionId: string, assetId: string, file: Express.Multer.File, userId: string) {
        await this.prisma.asset.findFirstOrThrow({ where: { id: assetId, productionId, deletedAt: null } });

        // storageKey pattern: productions/{productionId}/assets/{assetId}/{uuid}.{ext}
        const fileId = uuidv4();
        const ext = file.originalname.split('.').pop() || 'tmp';
        const storageKey = `productions/${productionId}/assets/${assetId}/${fileId}.${ext}`;

        await this.storage.putObject(storageKey, file.buffer, file.mimetype);

        return this.prisma.assetFile.create({
            data: {
                id: fileId,
                assetId,
                filename: file.originalname,
                storageKey,
                mimeType: file.mimetype,
                size: file.size,
                uploadedBy: userId,
            }
        });
    }

    async listFiles(productionId: string, assetId: string) {
        await this.prisma.asset.findFirstOrThrow({ where: { id: assetId, productionId, deletedAt: null } });
        return this.prisma.assetFile.findMany({
            where: { assetId },
            orderBy: { uploadedAt: 'desc' }
        });
    }

    async deleteFile(productionId: string, assetId: string, fileId: string) {
        const file = await this.prisma.assetFile.findFirstOrThrow({
            where: { id: fileId, assetId },
            include: { asset: true }
        });

        if (file.asset.productionId !== productionId) throw new ForbiddenException();

        await this.storage.deleteObject(file.storageKey);

        return this.prisma.assetFile.delete({ where: { id: fileId } });
    }

    async getFileUrl(productionId: string, assetId: string, fileId: string) {
        const file = await this.prisma.assetFile.findFirstOrThrow({
            where: { id: fileId, assetId },
            include: { asset: true }
        });

        if (file.asset.productionId !== productionId) throw new ForbiddenException();

        const url = await this.storage.getPresignedGetUrl(file.storageKey, 15 * 60);

        return { url };
    }

    // --- Continuity ---
    async listContinuityEvents(productionId: string, assetId: string) {
        await this.prisma.asset.findFirstOrThrow({ where: { id: assetId, productionId, deletedAt: null } });
        return this.prisma.continuityEvent.findMany({
            where: { assetId },
            include: { files: true },
            orderBy: { sceneNumber: 'asc' }
        });
    }

    async createContinuityEvent(productionId: string, assetId: string, dto: CreateContinuityDto) {
        await this.prisma.asset.findFirstOrThrow({ where: { id: assetId, productionId, deletedAt: null } });
        return this.prisma.continuityEvent.create({
            data: {
                assetId,
                sceneNumber: dto.sceneNumber,
                state: dto.state,
                notes: dto.notes
            }
        });
    }

    async updateContinuityEvent(productionId: string, assetId: string, continuityEventId: string, dto: UpdateContinuityDto) {
        await this.prisma.asset.findFirstOrThrow({ where: { id: assetId, productionId, deletedAt: null } });
        await this.prisma.continuityEvent.findFirstOrThrow({ where: { id: continuityEventId, assetId } });

        return this.prisma.continuityEvent.update({
            where: { id: continuityEventId },
            data: {
                sceneNumber: dto.sceneNumber,
                state: dto.state,
                notes: dto.notes
            }
        });
    }

    async deleteContinuityEvent(productionId: string, assetId: string, continuityEventId: string) {
        await this.prisma.asset.findFirstOrThrow({ where: { id: assetId, productionId, deletedAt: null } });
        await this.prisma.continuityEvent.findFirstOrThrow({ where: { id: continuityEventId, assetId } });

        // Let's delete it. If there are files attached, we should clean them up as well.
        const files = await this.prisma.continuityEventFile.findMany({
            where: { continuityEventId }
        });

        for (const file of files) {
            await this.storage.deleteObject(file.storageKey);
        }

        // The cascade delete in Prisma should handle deleting the ContinuityEventFile records if it's set up,
        // but if not, we delete them manually.
        await this.prisma.continuityEventFile.deleteMany({
            where: { continuityEventId }
        });

        return this.prisma.continuityEvent.delete({
            where: { id: continuityEventId }
        });
    }

    // --- Continuity Files ---
    async uploadContinuityFile(productionId: string, assetId: string, continuityEventId: string, file: Express.Multer.File, userId: string) {
        await this.prisma.asset.findFirstOrThrow({ where: { id: assetId, productionId, deletedAt: null } });
        await this.prisma.continuityEvent.findFirstOrThrow({ where: { id: continuityEventId, assetId } });

        const fileId = uuidv4();
        const ext = file.originalname.split('.').pop() || 'tmp';
        const storageKey = `productions/${productionId}/assets/${assetId}/continuity/${continuityEventId}/${fileId}.${ext}`;

        await this.storage.putObject(storageKey, file.buffer, file.mimetype);

        return this.prisma.continuityEventFile.create({
            data: {
                id: fileId,
                continuityEventId,
                filename: file.originalname,
                storageKey,
                mimeType: file.mimetype,
                size: file.size,
                uploadedBy: userId,
            }
        });
    }

    async getContinuityFileUrl(productionId: string, assetId: string, continuityEventId: string, fileId: string) {
        const file = await this.prisma.continuityEventFile.findFirstOrThrow({
            where: { id: fileId, continuityEventId },
            include: { continuityEvent: { include: { asset: true } } }
        });

        if (file.continuityEvent.asset.productionId !== productionId || file.continuityEvent.assetId !== assetId) {
            throw new ForbiddenException();
        }

        const url = await this.storage.getPresignedGetUrl(file.storageKey, 15 * 60);

        return { url };
    }

    async deleteContinuityFile(productionId: string, assetId: string, continuityEventId: string, fileId: string) {
        const file = await this.prisma.continuityEventFile.findFirstOrThrow({
            where: { id: fileId, continuityEventId },
            include: { continuityEvent: { include: { asset: true } } }
        });

        if (file.continuityEvent.asset.productionId !== productionId || file.continuityEvent.assetId !== assetId) {
            throw new ForbiddenException();
        }

        await this.storage.deleteObject(file.storageKey);

        return this.prisma.continuityEventFile.delete({ where: { id: fileId } });
    }

    // --- Continuity Resolver Engine ---

    // Sorts alphanumeric variations of scene numbers appropriately (e.g. 1, 2, 2A, 3, 10, 10B)
    private sortSceneNumbers(sceneA: string, sceneB: string): number {
        const parse = (scene: string) => {
            const match = scene.match(/^(\d+)([a-zA-Z]*)$/);
            if (!match) return { num: 0, suffix: scene };
            return { num: parseInt(match[1], 10), suffix: match[2].toLowerCase() };
        };

        const a = parse(sceneA);
        const b = parse(sceneB);

        if (a.num !== b.num) return a.num - b.num;
        return a.suffix.localeCompare(b.suffix);
    }

    async resolveState(productionId: string, assetId: string, sceneNumber: string) {
        // Find existing asset to enforce access
        await this.prisma.asset.findFirstOrThrow({ where: { id: assetId, productionId, deletedAt: null } });

        const events = await this.prisma.continuityEvent.findMany({
            where: { assetId }
        });

        // Sort chronologically based on scene numbers
        events.sort((a, b) => this.sortSceneNumbers(a.sceneNumber, b.sceneNumber));

        // Find the most recent event AT OR BEFORE the current scene number
        let resolvedState = 'ABSENT'; // Default state

        for (const event of events) {
            if (this.sortSceneNumbers(event.sceneNumber, sceneNumber) <= 0) {
                resolvedState = event.state;
            } else {
                // Since it's sorted, once we pass the target scene number, break
                break;
            }
        }

        return { assetId, sceneNumber, resolvedState };
    }
}
