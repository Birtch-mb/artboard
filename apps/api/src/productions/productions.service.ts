import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { Role } from '../common/types';

@Injectable()
export class ProductionsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(userId: string, dto: CreateProductionDto) {
    const standardTags = [
      'Props', 'Set Dressing', 'Graphics', 'Furniture', 'Hero Prop',
      'Vehicles', 'Expendables', 'Soft Furnishings', 'Greens',
      'Weapons', 'Food', 'Animals', 'Wardrobe', 'Special Effects'
    ];

    return this.prisma.production.create({
      data: {
        name: dto.name,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        wrapDate: dto.wrapDate ? new Date(dto.wrapDate) : undefined,
        members: {
          create: {
            userId,
            role: Role.ART_DIRECTOR,
          },
        },
        assetTags: {
          create: standardTags.map(name => ({ name })),
        }
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.production.findMany({
      where: {
        members: { some: { userId } },
        deletedAt: null,
      },
      include: {
        _count: { select: { members: true } },
        members: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.production.findUniqueOrThrow({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            coordinatorVisibility: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateProductionDto, memberRole: Role) {
    if (memberRole !== Role.ART_DIRECTOR && memberRole !== Role.PRODUCTION_DESIGNER) {
      throw new ForbiddenException('Only Art Directors and Production Designers can update productions');
    }

    return this.prisma.production.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.status && { status: dto.status }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.wrapDate && { wrapDate: new Date(dto.wrapDate) }),
      },
    });
  }

  async softDelete(id: string, memberRole: Role): Promise<void> {
    if (memberRole !== Role.ART_DIRECTOR && memberRole !== Role.PRODUCTION_DESIGNER) {
      throw new ForbiddenException('Only Art Directors and Production Designers can delete productions');
    }

    const production = await this.prisma.production.findUnique({ where: { id } });
    if (!production) throw new NotFoundException('Production not found');
    if (production.deletedAt) throw new BadRequestException('Production is already archived');

    await this.prisma.production.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardDelete(id: string, memberRole: Role): Promise<void> {
    if (memberRole !== Role.ART_DIRECTOR && memberRole !== Role.PRODUCTION_DESIGNER) {
      throw new ForbiddenException('Only Art Directors and Production Designers can delete productions');
    }

    const production = await this.prisma.production.findUnique({ where: { id } });
    if (!production) throw new NotFoundException('Production not found');

    await this.prisma.$transaction(async (tx) => {
      // Null out self-referencing FKs to avoid FK violations during delete
      await tx.$executeRaw`UPDATE "Scene" SET "parentSceneId" = NULL WHERE "productionId" = ${id}`;
      await tx.$executeRaw`UPDATE "Set" SET "parentSetId" = NULL WHERE "productionId" = ${id}`;
      await tx.$executeRaw`UPDATE "Script" SET "diffFromId" = NULL WHERE "productionId" = ${id}`;
      await tx.$executeRaw`UPDATE "Schedule" SET "diffFromId" = NULL WHERE "productionId" = ${id}`;

      // Scene-level junction tables
      await tx.sceneSchedule.deleteMany({ where: { scene: { productionId: id } } });
      await tx.sceneCharacter.deleteMany({ where: { scene: { productionId: id } } });
      await tx.sceneAsset.deleteMany({ where: { scene: { productionId: id } } });
      await tx.scene.deleteMany({ where: { productionId: id } });
      await tx.script.deleteMany({ where: { productionId: id } });

      // Asset tree
      await tx.continuityEventFile.deleteMany({ where: { continuityEvent: { asset: { productionId: id } } } });
      await tx.continuityEvent.deleteMany({ where: { asset: { productionId: id } } });
      await tx.assetTagMap.deleteMany({ where: { asset: { productionId: id } } });
      await tx.characterAsset.deleteMany({ where: { character: { productionId: id } } });
      await tx.assetSetMap.deleteMany({ where: { asset: { productionId: id } } });
      await tx.assetFile.deleteMany({ where: { asset: { productionId: id } } });
      await tx.asset.deleteMany({ where: { productionId: id } });
      await tx.character.deleteMany({ where: { productionId: id } });
      await tx.assetTag.deleteMany({ where: { productionId: id } });

      // Location + Set trees
      await tx.locationFile.deleteMany({ where: { location: { productionId: id } } });
      await tx.setLocation.deleteMany({ where: { set: { productionId: id } } });
      await tx.setFile.deleteMany({ where: { set: { productionId: id } } });
      await tx.setPhase.deleteMany({ where: { set: { productionId: id } } });
      await tx.set.deleteMany({ where: { productionId: id } });
      await tx.ganttPhase.deleteMany({ where: { productionId: id } });
      await tx.location.deleteMany({ where: { productionId: id } });

      // Schedule (ShootDay cascades, SceneSchedule already deleted)
      await tx.schedule.deleteMany({ where: { productionId: id } });

      // Members
      await tx.coordinatorVisibility.deleteMany({ where: { member: { productionId: id } } });
      await tx.productionMember.deleteMany({ where: { productionId: id } });

      // Activity + notifications
      await tx.notification.deleteMany({ where: { productionId: id } });
      await tx.activityLog.deleteMany({ where: { productionId: id } });

      await tx.production.delete({ where: { id } });
    });
  }
}
