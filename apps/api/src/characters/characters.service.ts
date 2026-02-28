import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { AssignCharacterAssetDto } from './dto/assign-character-asset.dto';

@Injectable()
export class CharactersService {
    constructor(private readonly prisma: PrismaService) { }

    async listCharacters(productionId: string): Promise<any[]> {
        const characters = await this.prisma.character.findMany({
            where: { productionId, deletedAt: null },
            orderBy: { name: 'asc' },
            include: {
                sceneAppearances: true,
                characterAssets: true,
            },
        });

        return characters.map((c) => ({
            id: c.id,
            name: c.name,
            height: c.height,
            notes: c.notes,
            createdAt: c.createdAt,
            sceneCount: c.sceneAppearances.length,
            assetCount: c.characterAssets.length,
        }));
    }

    async getCharacter(productionId: string, characterId: string): Promise<any> {
        const character = await this.prisma.character.findFirst({
            where: { id: characterId, productionId, deletedAt: null },
            include: {
                sceneAppearances: {
                    include: {
                        scene: {
                            select: {
                                id: true,
                                sceneNumber: true,
                                intExt: true,
                                scriptedLocationName: true,
                                timeOfDay: true,
                                synopsis: true,
                                wizardStatus: true,
                                script: { select: { id: true, versionLabel: true } },
                            },
                        },
                    },
                    orderBy: { scene: { sceneNumber: 'asc' } },
                },
                characterAssets: {
                    include: {
                        asset: {
                            select: {
                                id: true,
                                name: true,
                                category: true,
                                status: true,
                            },
                        },
                        set: {
                            select: { id: true, name: true },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!character) throw new NotFoundException('Character not found');

        return {
            id: character.id,
            name: character.name,
            height: character.height,
            photograph: character.photograph,
            notes: character.notes,
            createdAt: character.createdAt,
            updatedAt: character.updatedAt,
            scenes: character.sceneAppearances.map((sa) => sa.scene),
            assets: character.characterAssets.map((ca) => ({
                id: ca.id,
                assetId: ca.assetId,
                assetName: ca.asset.name,
                assetCategory: ca.asset.category,
                assetStatus: ca.asset.status,
                setId: ca.setId,
                setName: ca.set?.name ?? null,
                notes: ca.notes,
                createdAt: ca.createdAt,
            })),
        };
    }

    async createCharacter(
        productionId: string,
        dto: CreateCharacterDto,
    ): Promise<any> {
        const name = dto.name.trim();

        const existing = await this.prisma.character.findFirst({
            where: { productionId, name: { equals: name, mode: 'insensitive' }, deletedAt: null },
        });
        if (existing) {
            throw new ConflictException(`Character "${name}" already exists in this production`);
        }

        return this.prisma.character.create({
            data: {
                productionId,
                name,
                height: dto.height?.trim() || null,
                notes: dto.notes?.trim() || null,
            },
            select: { id: true, name: true, height: true, notes: true, createdAt: true },
        });
    }

    async updateCharacter(
        productionId: string,
        characterId: string,
        dto: UpdateCharacterDto,
    ): Promise<any> {
        const character = await this.prisma.character.findFirst({
            where: { id: characterId, productionId, deletedAt: null },
        });
        if (!character) throw new NotFoundException('Character not found');

        if (dto.name) {
            const nameConflict = await this.prisma.character.findFirst({
                where: {
                    productionId,
                    name: { equals: dto.name.trim(), mode: 'insensitive' },
                    deletedAt: null,
                    NOT: { id: characterId },
                },
            });
            if (nameConflict) {
                throw new ConflictException(`Character "${dto.name}" already exists`);
            }
        }

        return this.prisma.character.update({
            where: { id: characterId },
            data: {
                ...(dto.name && { name: dto.name.trim() }),
                ...(dto.height !== undefined && { height: dto.height }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
            },
            select: { id: true, name: true, height: true, notes: true, updatedAt: true },
        });
    }

    async deleteCharacter(productionId: string, characterId: string): Promise<void> {
        const character = await this.prisma.character.findFirst({
            where: { id: characterId, productionId, deletedAt: null },
        });
        if (!character) throw new NotFoundException('Character not found');

        await this.prisma.character.update({
            where: { id: characterId },
            data: { deletedAt: new Date() },
        });
    }

    async assignAsset(
        productionId: string,
        characterId: string,
        dto: AssignCharacterAssetDto,
    ): Promise<any> {
        const character = await this.prisma.character.findFirst({
            where: { id: characterId, productionId, deletedAt: null },
        });
        if (!character) throw new NotFoundException('Character not found');

        const asset = await this.prisma.asset.findFirst({
            where: { id: dto.assetId, productionId },
        });
        if (!asset) throw new NotFoundException('Asset not found in this production');

        if (dto.setId) {
            const set = await this.prisma.set.findFirst({
                where: { id: dto.setId, productionId, deletedAt: null },
            });
            if (!set) throw new NotFoundException('Set not found in this production');
        }

        const existing = await this.prisma.characterAsset.findUnique({
            where: { characterId_assetId: { characterId, assetId: dto.assetId } },
        });
        if (existing) {
            // Update the existing record (e.g. change set scoping or notes)
            return this.prisma.characterAsset.update({
                where: { characterId_assetId: { characterId, assetId: dto.assetId } },
                data: {
                    setId: dto.setId ?? null,
                    notes: dto.notes ?? null,
                },
                include: {
                    asset: { select: { id: true, name: true, category: true, status: true } },
                    set: { select: { id: true, name: true } },
                },
            });
        }

        return this.prisma.characterAsset.create({
            data: {
                characterId,
                assetId: dto.assetId,
                setId: dto.setId ?? null,
                notes: dto.notes ?? null,
            },
            include: {
                asset: { select: { id: true, name: true, category: true, status: true } },
                set: { select: { id: true, name: true } },
            },
        });
    }

    async removeAsset(
        productionId: string,
        characterId: string,
        assetId: string,
    ): Promise<void> {
        const character = await this.prisma.character.findFirst({
            where: { id: characterId, productionId, deletedAt: null },
        });
        if (!character) throw new NotFoundException('Character not found');

        const record = await this.prisma.characterAsset.findUnique({
            where: { characterId_assetId: { characterId, assetId } },
        });
        if (!record) throw new NotFoundException('Asset not assigned to this character');

        await this.prisma.characterAsset.delete({
            where: { characterId_assetId: { characterId, assetId } },
        });
    }
}
