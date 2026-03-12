import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(search?: string) {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            production: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      productionCount: u.memberships.length,
      roles: u.memberships.map((m) => ({ role: m.role, productionName: m.production.name })),
    }));
  }

  async deleteUser(targetId: string, requestingUserId: string): Promise<void> {
    if (targetId === requestingUserId) {
      throw new ForbiddenException('You cannot delete your own admin account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      include: { memberships: { select: { id: true } } },
    });

    if (!user) throw new NotFoundException('User not found');

    const memberIds = user.memberships.map((m) => m.id);

    await this.prisma.$transaction(async (tx) => {
      if (memberIds.length > 0) {
        await tx.coordinatorVisibility.deleteMany({ where: { productionMemberId: { in: memberIds } } });
        await tx.productionMember.deleteMany({ where: { userId: targetId } });
      }
      await tx.notification.deleteMany({ where: { userId: targetId } });
      // Activity logs have FK to user; null out actorId via raw since there's no onDelete
      await tx.$executeRaw`UPDATE "ActivityLog" SET "actorId" = ${requestingUserId} WHERE "actorId" = ${targetId}`;
      await tx.user.delete({ where: { id: targetId } });
    });
  }
}
