import { Injectable, ForbiddenException } from '@nestjs/common';
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
}
