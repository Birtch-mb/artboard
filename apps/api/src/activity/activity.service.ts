import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocketGateway } from '../socket/socket.gateway';

export interface LogActivityDto {
  productionId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  actorId: string;
  assetDepartment?: string;
  metadata?: Record<string, any>;
}

// Roles always notified for asset events regardless of department
const ASSET_ALWAYS_NOTIFY = ['ART_DIRECTOR', 'PRODUCTION_DESIGNER'];

// Department → additional roles to notify
const ASSET_DEPT_ROLES: Record<string, string[]> = {
  PROPS: ['PROPS_MASTER'],
  SET_DEC: ['SET_DECORATOR', 'LEADMAN'],
  GRAPHICS: [],
  SPFX: [],
  CONSTRUCTION: [],
  PICTURE_CARS: [],
  OTHER: [],
};

// Roles that should receive notifications for a given action
const NOTIFY_RULES: Record<string, string[]> = {
  SCRIPT_UPLOADED: ['ART_DIRECTOR', 'PRODUCTION_DESIGNER'],
  SCRIPT_FLAGGED: ['ART_DIRECTOR', 'PRODUCTION_DESIGNER'],
  SCHEDULE_PUBLISHED: ['ART_DIRECTOR', 'PRODUCTION_DESIGNER', 'COORDINATOR', 'SET_DECORATOR', 'LEADMAN', 'PROPS_MASTER', 'VIEWER'],
  SHOOT_DAY_CREATED: ['ART_DIRECTOR', 'PRODUCTION_DESIGNER', 'COORDINATOR', 'SET_DECORATOR', 'LEADMAN', 'PROPS_MASTER', 'VIEWER'],
};

function getNotifyKey(entityType: string, action: string): string {
  if (entityType === 'SCRIPT' && action === 'UPLOADED') return 'SCRIPT_UPLOADED';
  if (entityType === 'SCRIPT' && action === 'FLAGGED') return 'SCRIPT_FLAGGED';
  if (entityType === 'SCENE' && action === 'FLAGGED') return 'SCRIPT_FLAGGED';
  if (entityType === 'SCHEDULE' && action === 'PUBLISHED') return 'SCHEDULE_PUBLISHED';
  if (entityType === 'SHOOT_DAY' && action === 'CREATED') return 'SHOOT_DAY_CREATED';
  // ASSET notifications are handled separately with department-aware logic
  if (entityType === 'ASSET') return 'ASSET';
  return '';
}

function getUrgency(notifyKey: string, metadata?: Record<string, any>): string {
  if (notifyKey === 'SCRIPT_FLAGGED') return 'NEEDS_REVIEW';
  if (notifyKey === 'SCHEDULE_PUBLISHED' && metadata?.changeSummary?.length > 1) return 'HIGH';
  if (notifyKey === 'SHOOT_DAY_CREATED' && metadata?.withinFortyEightHours) return 'URGENT';
  return 'NORMAL';
}

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socket: SocketGateway,
  ) {}

  async log(dto: LogActivityDto): Promise<any> {
    const entry = await this.prisma.activityLog.create({
      data: {
        productionId: dto.productionId,
        entityType: dto.entityType as any,
        entityId: dto.entityId,
        entityName: dto.entityName,
        action: dto.action as any,
        actorId: dto.actorId,
        metadata: dto.metadata ?? undefined,
      },
      include: {
        actor: { select: { id: true, name: true } },
      },
    });

    // Fan-out notifications
    const notifyKey = getNotifyKey(dto.entityType, dto.action);
    if (notifyKey) {
      let rolesToNotify: string[];
      if (notifyKey === 'ASSET') {
        // Department-aware fan-out: always notify AD/PD, plus dept-specific roles
        const deptRoles = ASSET_DEPT_ROLES[dto.assetDepartment ?? 'OTHER'] ?? [];
        rolesToNotify = [...ASSET_ALWAYS_NOTIFY, ...deptRoles];
      } else {
        rolesToNotify = NOTIFY_RULES[notifyKey] ?? [];
      }
      const members = await this.prisma.productionMember.findMany({
        where: { productionId: dto.productionId, role: { in: rolesToNotify as any[] } },
        select: { userId: true, role: true },
      });

      if (members.length > 0) {
        const urgency = getUrgency(notifyKey, dto.metadata);
        await this.prisma.notification.createMany({
          data: members.map((m) => ({
            userId: m.userId,
            productionId: dto.productionId,
            activityLogId: entry.id,
            urgency: urgency as any,
          })),
          skipDuplicates: true,
        });

        // Emit per-user unread count update
        for (const member of members) {
          const count = await this.prisma.notification.count({
            where: { userId: member.userId, productionId: dto.productionId, readAt: null },
          });
          this.socket.server?.to(dto.productionId).emit('notification', {
            userId: member.userId,
            unreadCount: count,
          });
        }
      }
    }

    // Broadcast activity to production room
    this.socket.server?.to(dto.productionId).emit('activity', this.serializeEntry(entry));

    return entry;
  }

  async getProductionFeed(
    productionId: string,
    userId: string,
    role: string,
    coVisibility: Record<string, boolean> | null,
    typeFilter?: string,
    limit = 20,
    cursor?: string,
  ): Promise<any> {
    const entityTypeFilter = this.resolveEntityTypeFilter(role, coVisibility, typeFilter);

    const where: any = {
      productionId,
      ...(entityTypeFilter ? { entityType: { in: entityTypeFilter } } : {}),
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    };

    const items = await this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        actor: { select: { id: true, name: true } },
        notifications: {
          where: { userId },
          select: { id: true, readAt: true, urgency: true },
        },
      },
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : null;

    return {
      items: page.map((item) => this.serializeEntry(item)),
      nextCursor,
    };
  }

  async getUserNotifications(userId: string, productionId: string): Promise<any[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId, productionId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        activityLog: {
          include: { actor: { select: { id: true, name: true } } },
        },
      },
    });

    return notifications.map((n) => ({
      id: n.id,
      urgency: n.urgency,
      readAt: n.readAt,
      createdAt: n.createdAt,
      activityLog: n.activityLog ? this.serializeEntry(n.activityLog) : null,
    }));
  }

  async getUnreadCount(userId: string, productionId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, productionId, readAt: null },
    });
  }

  async markRead(notificationId: string, userId: string): Promise<any> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new ForbiddenException('Notification not found');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string, productionId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, productionId, readAt: null },
      data: { readAt: new Date() },
    });
    return { count: result.count };
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private resolveEntityTypeFilter(
    role: string,
    coVisibility: Record<string, boolean> | null,
    typeFilter?: string,
  ): string[] | null {
    // Map UI filter tab → entity types
    const tabMap: Record<string, string[]> = {
      script: ['SCRIPT', 'SCENE'],
      schedule: ['SCHEDULE', 'SHOOT_DAY'],
      assets: ['ASSET'],
      sets: ['SET'],
    };

    let allowed: string[] | null = null;

    if (role === 'COORDINATOR' && coVisibility) {
      const permitted: string[] = [];
      if (coVisibility.showScript) permitted.push('SCRIPT', 'SCENE');
      if (coVisibility.showSchedule) permitted.push('SCHEDULE', 'SHOOT_DAY');
      if (coVisibility.showSets) permitted.push('SET');
      if (coVisibility.showAssets) permitted.push('ASSET');
      if (coVisibility.showLocations) permitted.push('LOCATION');
      allowed = permitted;
    }

    if (typeFilter && tabMap[typeFilter]) {
      const tabTypes = tabMap[typeFilter];
      allowed = allowed ? allowed.filter((t) => tabTypes.includes(t)) : tabTypes;
    }

    return allowed;
  }

  private serializeEntry(entry: any): any {
    const notification = entry.notifications?.[0] ?? null;
    return {
      id: entry.id,
      productionId: entry.productionId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityName: entry.entityName,
      action: entry.action,
      actor: entry.actor ?? null,
      metadata: entry.metadata ?? null,
      createdAt: entry.createdAt,
      isUnread: notification ? !notification.readAt : false,
      notificationId: notification?.id ?? null,
      urgency: notification?.urgency ?? null,
    };
  }
}
