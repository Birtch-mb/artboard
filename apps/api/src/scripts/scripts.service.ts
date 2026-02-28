import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ScreenplayParserService } from './screenplay-parser.service';
import { ActivityService } from '../activity/activity.service';
import { UpdateScriptDto } from './dto/update-script.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ScriptsService {
    private readonly logger = new Logger(ScriptsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly parser: ScreenplayParserService,
        private readonly activity: ActivityService,
    ) { }

    async uploadScript(
        productionId: string,
        file: Express.Multer.File,
        versionLabel: string,
        userId: string,
    ): Promise<any> {
        // Find the previous script to link as diffFrom
        const prevScript = await this.prisma.script.findFirst({
            where: { productionId },
            orderBy: { uploadedAt: 'desc' },
        });

        // Store PDF in R2
        const fileId = uuidv4();
        const storageKey = `productions/${productionId}/scripts/${fileId}.pdf`;

        await this.storage.putObject(storageKey, file.buffer, 'application/pdf');

        // Create the Script record
        const script = await this.prisma.script.create({
            data: {
                productionId,
                versionLabel,
                filename: file.originalname,
                storageKey,
                uploadedBy: userId,
                diffFromId: prevScript?.id ?? null,
            },
        });

        const parsedScenes = await this.parser.parse(file.buffer);

        if (parsedScenes.length > 0) {
            this.logger.log(
                `Parsed ${parsedScenes.length} scenes from "${versionLabel}"`,
            );

            // Fetch previous scenes if this is a new version
            let prevScenes: any[] = [];
            if (prevScript) {
                prevScenes = await this.prisma.scene.findMany({
                    where: { scriptId: prevScript.id, deletedAt: null, parentSceneId: null },
                    include: {
                        assetAssignments: true,
                        characters: true,
                        children: {
                            include: {
                                assetAssignments: true,
                                characters: true,
                            }
                        }
                    }
                });
            }

            const prevScenesMap = new Map(prevScenes.map(s => [s.sceneNumber, s]));
            const handledPrevSceneNumbers = new Set<string>();

            // Determine flags and create the new parent scenes
            for (const s of parsedScenes) {
                const prevNode = prevScenesMap.get(s.sceneNumber);
                handledPrevSceneNumbers.add(s.sceneNumber);

                let flag = 'NONE';
                if (!prevScript) {
                    flag = 'NONE';
                } else if (!prevNode) {
                    flag = 'ADDED';
                } else if (prevNode.sceneText !== s.sceneText) {
                    flag = 'MODIFIED';
                }

                // Create the parent scene inline so we can get its ID to copy joins
                const newScene = await this.prisma.scene.create({
                    data: {
                        scriptId: script.id,
                        productionId,
                        sceneNumber: s.sceneNumber,
                        intExt: s.intExt as any,
                        scriptedLocationName: s.scriptedLocationName,
                        timeOfDay: s.timeOfDay as any,
                        sceneText: s.sceneText || null,
                        changeFlag: flag as any,
                        setId: prevNode?.setId ?? null,
                        synopsis: prevNode?.synopsis ?? null,
                        notes: prevNode?.notes ?? null,
                        pageCount: prevNode?.pageCount ?? null,
                        wizardStatus: prevNode ? prevNode.wizardStatus : 'PENDING',
                    }
                });

                // Copy over characters and assets for the parent scene
                if (prevNode) {
                    if (prevNode.characters.length > 0) {
                        await this.prisma.sceneCharacter.createMany({
                            data: prevNode.characters.map((sc: any) => ({
                                sceneId: newScene.id,
                                characterId: sc.characterId
                            }))
                        });
                    }
                    if (prevNode.assetAssignments.length > 0) {
                        await this.prisma.sceneAsset.createMany({
                            data: prevNode.assetAssignments.map((sa: any) => ({
                                sceneId: newScene.id,
                                assetId: sa.assetId
                            }))
                        });
                    }

                    // Copy over manually split sub-scenes (A/B/C)
                    if (prevNode.children && prevNode.children.length > 0) {
                        for (const child of prevNode.children) {
                            const newChild = await this.prisma.scene.create({
                                data: {
                                    scriptId: script.id,
                                    productionId,
                                    sceneNumber: child.sceneNumber,
                                    parentSceneId: newScene.id,
                                    intExt: child.intExt,
                                    scriptedLocationName: child.scriptedLocationName,
                                    timeOfDay: child.timeOfDay,
                                    sceneText: child.sceneText,
                                    changeFlag: 'NONE', // Custom sub-scenes don't trigger diffs directly from parser
                                    setId: child.setId,
                                    synopsis: child.synopsis,
                                    notes: child.notes,
                                    pageCount: child.pageCount,
                                    wizardStatus: child.wizardStatus,
                                }
                            });

                            if (child.characters.length > 0) {
                                await this.prisma.sceneCharacter.createMany({
                                    data: child.characters.map((sc: any) => ({
                                        sceneId: newChild.id,
                                        characterId: sc.characterId
                                    }))
                                });
                            }
                            if (child.assetAssignments.length > 0) {
                                await this.prisma.sceneAsset.createMany({
                                    data: child.assetAssignments.map((sa: any) => ({
                                        sceneId: newChild.id,
                                        assetId: sa.assetId
                                    }))
                                });
                            }
                        }
                    }
                }
            }

            // Identify OMITTED scenes (existed in prev version, not in new version)
            const omittedScenes = prevScenes.filter(s => !handledPrevSceneNumbers.has(s.sceneNumber));
            for (const prevNode of omittedScenes) {
                // Determine order logically - for now we just append them or they sort naturally by number
                const newOmittedScene = await this.prisma.scene.create({
                    data: {
                        scriptId: script.id,
                        productionId,
                        sceneNumber: prevNode.sceneNumber,
                        intExt: prevNode.intExt,
                        scriptedLocationName: prevNode.scriptedLocationName,
                        timeOfDay: prevNode.timeOfDay,
                        sceneText: prevNode.sceneText,
                        changeFlag: 'OMITTED',
                        setId: prevNode.setId,
                        synopsis: prevNode.synopsis,
                        notes: prevNode.notes,
                        pageCount: prevNode.pageCount,
                        wizardStatus: prevNode.wizardStatus,
                    }
                });

                if (prevNode.characters.length > 0) {
                    await this.prisma.sceneCharacter.createMany({
                        data: prevNode.characters.map((sc: any) => ({
                            sceneId: newOmittedScene.id,
                            characterId: sc.characterId
                        }))
                    });
                }
                if (prevNode.assetAssignments.length > 0) {
                    await this.prisma.sceneAsset.createMany({
                        data: prevNode.assetAssignments.map((sa: any) => ({
                            sceneId: newOmittedScene.id,
                            assetId: sa.assetId
                        }))
                    });
                }
            }

            // Character auto-detection disabled — characters are managed manually.
        } else {
            this.logger.warn(
                `No scenes parsed from "${versionLabel}" — PDF may be a scan or non-standard format`,
            );
        }

        // Count flagged scenes for activity log metadata
        const flaggedSceneCount = await this.prisma.scene.count({
            where: { scriptId: script.id, changeFlag: { not: 'NONE' }, deletedAt: null },
        });

        await this.activity.log({
            productionId,
            entityType: 'SCRIPT',
            entityId: script.id,
            entityName: versionLabel,
            action: flaggedSceneCount > 0 ? 'FLAGGED' : 'UPLOADED',
            actorId: userId,
            metadata: { versionLabel, flaggedSceneCount },
        }).catch(() => {});

        return {
            ...script,
            scenesCreated: parsedScenes.length,
            isFirstScript: prevScript === null,
        };
    }

    async listScripts(productionId: string): Promise<any[]> {
        const scripts = await this.prisma.script.findMany({
            where: { productionId },
            orderBy: { uploadedAt: 'desc' },
            include: {
                _count: {
                    select: { scenes: { where: { deletedAt: null } } },
                },
            },
        });

        const uploaderIds = [...new Set(scripts.map((s) => s.uploadedBy))];
        const uploaders = await this.prisma.user.findMany({
            where: { id: { in: uploaderIds } },
            select: { id: true, name: true, email: true },
        });
        const uploaderMap = Object.fromEntries(uploaders.map((u) => [u.id, u]));

        const scriptsWithFlags = await Promise.all(scripts.map(async (s) => {
            const unreviewedFlags = await this.prisma.scene.count({
                where: { scriptId: s.id, deletedAt: null, changeFlag: { not: 'NONE' }, changeReviewed: false }
            });
            return {
                ...s,
                unreviewedFlags,
            };
        }));

        return scriptsWithFlags.map((s, idx) => ({
            ...s,
            uploader: uploaderMap[s.uploadedBy] ?? null,
            isCurrent: idx === 0,
        }));
    }

    async getScript(productionId: string, scriptId: string): Promise<any> {
        const script = await this.prisma.script.findFirst({
            where: { id: scriptId, productionId },
            include: {
                _count: {
                    select: { scenes: { where: { deletedAt: null } } },
                },
            },
        });

        if (!script) throw new NotFoundException('Script not found');

        const uploader = await this.prisma.user.findUnique({
            where: { id: script.uploadedBy },
            select: { id: true, name: true, email: true },
        });

        return { ...script, uploader };
    }

    async getScriptUrl(
        productionId: string,
        scriptId: string,
    ): Promise<{ url: string }> {
        const script = await this.prisma.script.findFirst({
            where: { id: scriptId, productionId },
        });

        if (!script) throw new NotFoundException('Script not found');

        const url = await this.storage.getPresignedGetUrl(script.storageKey, 60 * 60);

        return { url };
    }

    async updateScript(
        productionId: string,
        scriptId: string,
        dto: UpdateScriptDto,
    ): Promise<any> {
        await this.prisma.script.findFirstOrThrow({
            where: { id: scriptId, productionId },
        });

        return this.prisma.script.update({
            where: { id: scriptId },
            data: dto,
        });
    }

    async deleteScript(productionId: string, scriptId: string): Promise<void> {
        const script = await this.prisma.script.findFirst({
            where: { id: scriptId, productionId },
        });
        if (!script) throw new NotFoundException('Script not found');

        // Collect all scene IDs for this script
        const scenes = await this.prisma.scene.findMany({
            where: { scriptId },
            select: { id: true },
        });
        const sceneIds = scenes.map((s) => s.id);

        // Tear down in FK order inside a transaction:
        // SceneCharacter → SceneAsset → Scene → Script
        await this.prisma.$transaction([
            this.prisma.sceneCharacter.deleteMany({ where: { sceneId: { in: sceneIds } } }),
            this.prisma.sceneAsset.deleteMany({ where: { sceneId: { in: sceneIds } } }),
            this.prisma.scene.deleteMany({ where: { scriptId } }),
            this.prisma.script.delete({ where: { id: scriptId } }),
        ]);

        // Remove the PDF from R2 (best effort — don't fail the request if this errors)
        try {
            await this.storage.deleteObject(script.storageKey);
        } catch (err: any) {
            this.logger.warn(`Could not remove script file from storage: ${err.message}`);
        }
    }
}
