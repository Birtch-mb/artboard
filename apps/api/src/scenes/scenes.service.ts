import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { SplitSceneDto } from './dto/split-scene.dto';
import { stripWatermark } from '../common/utils/strip-watermark';

function parseSceneNumber(num: string): { leadingAlpha: string; prefix: number; suffix: string } {
    const match = num.match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
    if (!match) return { leadingAlpha: '', prefix: 0, suffix: num };
    return { leadingAlpha: match[1], prefix: parseInt(match[2], 10), suffix: match[3] };
}

function compareSceneNumbers(a: string, b: string): number {
    const pa = parseSceneNumber(a);
    const pb = parseSceneNumber(b);
    if (pa.prefix !== pb.prefix) return pa.prefix - pb.prefix;
    if (pa.suffix !== pb.suffix) return pa.suffix.localeCompare(pb.suffix);
    return pa.leadingAlpha.localeCompare(pb.leadingAlpha);
}

const SCENE_LIST_INCLUDE = {
    set: {
        select: {
            id: true,
            name: true,
            locations: {
                include: { location: { select: { id: true, name: true } } },
            },
        },
    },
    children: { where: { deletedAt: null }, select: { id: true, sceneNumber: true } },
    _count: {
        select: {
            assetAssignments: true,
            children: { where: { deletedAt: null } },
            characters: true,
        },
    },
};

function formatScene(scene: any) {
    return {
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        intExt: scene.intExt,
        scriptedLocationName: scene.scriptedLocationName,
        timeOfDay: scene.timeOfDay,
        synopsis: scene.synopsis,
        notes: scene.notes ?? null,
        pageCount: scene.pageCount,
        changeFlag: scene.changeFlag,
        changeReviewed: scene.changeReviewed,
        wizardStatus: scene.wizardStatus,
        parentSceneId: scene.parentSceneId,
        set: scene.set ?? null,
        location: scene.set?.locations?.[0]?.location ?? null,
        children: (scene.children ?? []).sort((a: any, b: any) =>
            compareSceneNumbers(a.sceneNumber, b.sceneNumber),
        ),
        _count: {
            assets: scene._count?.assetAssignments ?? 0,
            children: scene._count?.children ?? 0,
            characters: scene._count?.characters ?? 0,
        },
    };
}

@Injectable()
export class ScenesService {
    constructor(private readonly prisma: PrismaService) { }

    async createScene(
        productionId: string,
        scriptId: string,
        dto: CreateSceneDto,
    ): Promise<any> {
        // Verify script belongs to production
        const script = await this.prisma.script.findFirst({
            where: { id: scriptId, productionId },
        });
        if (!script) throw new NotFoundException('Script not found');

        // Validate setId belongs to same production
        if (dto.setId) {
            const s = await this.prisma.set.findFirst({
                where: { id: dto.setId, productionId, deletedAt: null },
            });
            if (!s) throw new BadRequestException('Set not found in this production');
        }

        // Check sceneNumber uniqueness within script
        const existing = await this.prisma.scene.findFirst({
            where: { scriptId, sceneNumber: dto.sceneNumber, deletedAt: null },
        });
        if (existing) {
            throw new BadRequestException(
                `Scene number "${dto.sceneNumber}" already exists in this script`,
            );
        }

        const scene = await this.prisma.scene.create({
            data: {
                scriptId,
                productionId,
                sceneNumber: dto.sceneNumber,
                intExt: dto.intExt,
                scriptedLocationName: dto.scriptedLocationName,
                timeOfDay: dto.timeOfDay,
                synopsis: dto.synopsis ?? null,
                pageCount: dto.pageCount ?? null,
                setId: dto.setId ?? null,
                sceneText: dto.sceneText ?? null,
            },
            include: SCENE_LIST_INCLUDE,
        });

        return formatScene(scene);
    }

    async listScenes(
        productionId: string,
        scriptId: string,
        filters: { changeFlag?: string; setId?: string },
    ): Promise<any[]> {
        const script = await this.prisma.script.findFirst({
            where: { id: scriptId, productionId },
        });
        if (!script) throw new NotFoundException('Script not found');

        const where: any = { scriptId, deletedAt: null };
        if (filters.changeFlag) {
            where.changeFlag = filters.changeFlag;
        }
        if (filters.setId) {
            where.setId = filters.setId;
        }

        const scenes = await this.prisma.scene.findMany({
            where,
            include: SCENE_LIST_INCLUDE,
        });

        return scenes
            .sort((a, b) => compareSceneNumbers(a.sceneNumber, b.sceneNumber))
            .map(formatScene);
    }

    async getScene(productionId: string, sceneId: string): Promise<any> {
        const scene = await this.prisma.scene.findFirst({
            where: { id: sceneId, productionId, deletedAt: null },
            include: {
                script: { select: { diffFromId: true, watermarkName: true } },
                set: {
                    select: {
                        id: true,
                        name: true,
                        locations: {
                            include: { location: { select: { id: true, name: true } } },
                        },
                    },
                },
                children: {
                    where: { deletedAt: null },
                    select: { id: true, sceneNumber: true },
                },
                assetAssignments: {
                    include: {
                        asset: {
                            select: {
                                id: true,
                                name: true,
                                department: true,
                                subDepartment: true,
                                status: true,
                            },
                        },
                    },
                },
                characters: {
                    include: {
                        character: { select: { id: true, name: true } },
                    },
                    orderBy: { character: { name: 'asc' } },
                },
                _count: {
                    select: {
                        assetAssignments: true,
                        children: { where: { deletedAt: null } },
                    },
                },
            },
        });

        if (!scene) throw new NotFoundException('Scene not found');

        // Resolve previousRawText — one hop only, never traverse further
        const watermarkName = scene.script?.watermarkName ?? null;
        let previousRawText: string | null = null;
        const needsDiff =
            scene.changeFlag === 'MODIFIED' || scene.changeFlag === 'RENUMBERED';
        if (needsDiff && scene.script.diffFromId) {
            const prevScene = await this.prisma.scene.findFirst({
                where: {
                    scriptId: scene.script.diffFromId,
                    sceneNumber: scene.sceneNumber,
                    deletedAt: null,
                },
                select: { sceneText: true },
            });
            if (prevScene?.sceneText) {
                previousRawText = stripWatermark(prevScene.sceneText, watermarkName);
            }
        }

        return {
            ...formatScene(scene),
            sceneText: stripWatermark(scene.sceneText ?? null, watermarkName),
            previousRawText,
            assets: scene.assetAssignments.map((a) => a.asset),
            characters: scene.characters.map((sc) => sc.character),
        };
    }

    async updateScene(
        productionId: string,
        sceneId: string,
        dto: UpdateSceneDto,
    ): Promise<any> {
        const scene = await this.prisma.scene.findFirst({
            where: { id: sceneId, productionId, deletedAt: null },
        });
        if (!scene) throw new NotFoundException('Scene not found');

        // Validate sceneNumber uniqueness if changing it
        if (dto.sceneNumber && dto.sceneNumber !== scene.sceneNumber) {
            const existing = await this.prisma.scene.findFirst({
                where: {
                    scriptId: scene.scriptId,
                    sceneNumber: dto.sceneNumber,
                    deletedAt: null,
                    id: { not: sceneId },
                },
            });
            if (existing) {
                throw new BadRequestException(
                    `Scene number "${dto.sceneNumber}" already exists in this script`,
                );
            }
        }

        const updated = await this.prisma.scene.update({
            where: { id: sceneId },
            data: dto,
            include: SCENE_LIST_INCLUDE,
        });

        return formatScene(updated);
    }

    async deleteScene(productionId: string, sceneId: string): Promise<any> {
        const scene = await this.prisma.scene.findFirst({
            where: { id: sceneId, productionId, deletedAt: null },
            include: {
                _count: { select: { children: { where: { deletedAt: null } } } },
            },
        });
        if (!scene) throw new NotFoundException('Scene not found');

        if (scene._count.children > 0) {
            throw new BadRequestException('Cannot delete a scene that has sub-scenes');
        }

        return this.prisma.scene.update({
            where: { id: sceneId },
            data: { deletedAt: new Date() },
        });
    }

    async reviewScene(
        productionId: string,
        sceneId: string,
        changeReviewed: boolean,
    ): Promise<any> {
        const scene = await this.prisma.scene.findFirst({
            where: { id: sceneId, productionId, deletedAt: null },
        });
        if (!scene) throw new NotFoundException('Scene not found');

        const updated = await this.prisma.scene.update({
            where: { id: sceneId },
            data: {
                changeReviewed,
                ...(changeReviewed ? { changeFlag: 'NONE' } : {})
            },
            include: SCENE_LIST_INCLUDE,
        });

        return formatScene(updated);
    }

    async splitScene(
        productionId: string,
        sceneId: string,
        dto: SplitSceneDto,
    ): Promise<any> {
        const parent = await this.prisma.scene.findFirst({
            where: { id: sceneId, productionId, deletedAt: null },
            include: {
                assetAssignments: { select: { assetId: true } },
                children: { where: { deletedAt: null }, select: { id: true, sceneNumber: true } },
            },
        });
        if (!parent) throw new NotFoundException('Scene not found');

        // Validate sub-scene numbers are unique in the script
        const subSceneNumbers = dto.subScenes.map((s) => s.sceneNumber);
        const existingConflicts = await this.prisma.scene.findMany({
            where: {
                scriptId: parent.scriptId,
                sceneNumber: { in: subSceneNumbers },
                deletedAt: null,
            },
            select: { sceneNumber: true },
        });
        if (existingConflicts.length > 0) {
            const conflicting = existingConflicts.map((s) => s.sceneNumber).join(', ');
            throw new BadRequestException(
                `Scene numbers already exist in this script: ${conflicting}`,
            );
        }

        // Create sub-scenes
        const parentAssetIds = parent.assetAssignments.map((a) => a.assetId);

        const createdChildren = await Promise.all(
            dto.subScenes.map((sub) =>
                this.prisma.scene.create({
                    data: {
                        scriptId: parent.scriptId,
                        productionId,
                        sceneNumber: sub.sceneNumber,
                        parentSceneId: parent.id,
                        intExt: parent.intExt,
                        scriptedLocationName: parent.scriptedLocationName,
                        setId: parent.setId,
                        timeOfDay: parent.timeOfDay,
                        synopsis: parent.synopsis,
                        pageCount: null,
                        assetAssignments: {
                            create: parentAssetIds.map((assetId) => ({ assetId })),
                        },
                    },
                    include: SCENE_LIST_INCLUDE,
                }),
            ),
        );

        const updatedParent = await this.prisma.scene.findFirst({
            where: { id: sceneId },
            include: SCENE_LIST_INCLUDE,
        });

        return {
            parent: formatScene(updatedParent!),
            children: createdChildren.map(formatScene),
        };
    }

    async assignSet(
        productionId: string,
        sceneId: string,
        setId: string | null,
    ): Promise<any> {
        const scene = await this.prisma.scene.findFirst({
            where: { id: sceneId, productionId, deletedAt: null },
        });
        if (!scene) throw new NotFoundException('Scene not found');

        if (setId !== null) {
            const s = await this.prisma.set.findFirst({
                where: { id: setId, productionId, deletedAt: null },
            });
            if (!s) throw new BadRequestException('Set not found in this production');
        }

        const updated = await this.prisma.scene.update({
            where: { id: sceneId },
            data: { setId },
            include: SCENE_LIST_INCLUDE,
        });

        return formatScene(updated);
    }

    async assignAsset(
        productionId: string,
        sceneId: string,
        assetId: string,
    ): Promise<any> {
        const scene = await this.prisma.scene.findFirst({
            where: { id: sceneId, productionId, deletedAt: null },
        });
        if (!scene) throw new NotFoundException('Scene not found');

        const asset = await this.prisma.asset.findFirst({
            where: { id: assetId, productionId, deletedAt: null },
        });
        if (!asset) throw new BadRequestException('Asset not found in this production');

        return this.prisma.sceneAsset.create({
            data: { sceneId, assetId },
        });
    }

    async removeAsset(
        productionId: string,
        sceneId: string,
        assetId: string,
    ): Promise<void> {
        const scene = await this.prisma.scene.findFirst({
            where: { id: sceneId, productionId, deletedAt: null },
        });
        if (!scene) throw new NotFoundException('Scene not found');

        await this.prisma.sceneAsset.delete({
            where: { sceneId_assetId: { sceneId, assetId } },
        });
    }

    async assignCharacter(
        productionId: string,
        sceneId: string,
        characterId: string,
    ): Promise<any> {
        const scene = await this.prisma.scene.findFirst({
            where: { id: sceneId, productionId, deletedAt: null },
        });
        if (!scene) throw new NotFoundException('Scene not found');

        const character = await this.prisma.character.findFirst({
            where: { id: characterId, productionId },
        });
        if (!character) throw new BadRequestException('Character not found in this production');

        return this.prisma.sceneCharacter.create({
            data: { sceneId, characterId },
        });
    }

    async removeCharacter(
        productionId: string,
        sceneId: string,
        characterId: string,
    ): Promise<void> {
        const scene = await this.prisma.scene.findFirst({
            where: { id: sceneId, productionId, deletedAt: null },
        });
        if (!scene) throw new NotFoundException('Scene not found');

        await this.prisma.sceneCharacter.delete({
            where: { sceneId_characterId: { sceneId, characterId } },
        });
    }
}
