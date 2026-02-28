import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateShootDayDto } from './dto/create-shoot-day.dto';
import { UpdateShootDayDto } from './dto/update-shoot-day.dto';

const SCENE_INCLUDE = {
  set: { select: { id: true, name: true } },
  characters: {
    include: {
      character: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) { }

  private async getDraftSchedule(productionId: string) {
    let draft = await this.prisma.schedule.findFirst({
      where: { productionId, status: 'DRAFT' },
    });
    if (!draft) {
      draft = await this.prisma.schedule.create({
        data: { productionId, versionLabel: 'Draft', status: 'DRAFT' },
      });
    }
    return draft;
  }

  async findSchedule(productionId: string): Promise<any> {
    const draft = await this.getDraftSchedule(productionId);
    const [shootDays, unscheduledScenes] = await Promise.all([
      this.prisma.shootDay.findMany({
        where: { scheduleId: draft.id },
        orderBy: { dayNumber: 'asc' },
        include: {
          scenes: {
            where: { scene: { deletedAt: null } },
            orderBy: { order: 'asc' },
            include: {
              scene: { include: SCENE_INCLUDE },
            },
          },
        },
      }),
      this.prisma.scene.findMany({
        where: {
          productionId,
          deletedAt: null,
          scheduleEntry: null, // this works for draft since a scene can only be in one place in active schedule
        },
        include: SCENE_INCLUDE,
      }),
    ]);

    return { schedule: draft, shootDays, unscheduledScenes };
  }

  async createShootDay(productionId: string, dto: CreateShootDayDto, actorId?: string): Promise<any> {
    const draft = await this.getDraftSchedule(productionId);
    const lastDay = await this.prisma.shootDay.findFirst({
      where: { scheduleId: draft.id },
      orderBy: { dayNumber: 'desc' },
    });
    const dayNumber = (lastDay?.dayNumber ?? 0) + 1;

    const day = await this.prisma.shootDay.create({
      data: {
        scheduleId: draft.id,
        dayNumber,
        date: dto.date ? new Date(dto.date) : null,
        notes: dto.notes ?? null,
      },
    });

    if (actorId) {
      const dateValue = dto.date ? new Date(dto.date) : null;
      const withinFortyEightHours = dateValue
        ? (dateValue.getTime() - Date.now()) < 48 * 60 * 60 * 1000 && dateValue.getTime() > Date.now()
        : false;
      await this.activity.log({
        productionId,
        entityType: 'SHOOT_DAY',
        entityId: day.id,
        entityName: `Shoot Day ${dayNumber}`,
        action: 'CREATED',
        actorId,
        metadata: { dayNumber, date: dto.date ?? null, withinFortyEightHours },
      }).catch(() => {});
    }

    return day;
  }

  async updateShootDay(
    productionId: string,
    dayId: string,
    dto: UpdateShootDayDto,
  ): Promise<any> {
    const draft = await this.getDraftSchedule(productionId);
    const day = await this.prisma.shootDay.findFirst({
      where: { id: dayId, scheduleId: draft.id },
    });
    if (!day) throw new NotFoundException(`Shoot day ${dayId} not found`);

    return this.prisma.shootDay.update({
      where: { id: dayId },
      data: {
        ...(dto.date !== undefined
          ? { date: dto.date ? new Date(dto.date) : null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async deleteShootDay(productionId: string, dayId: string): Promise<any> {
    const draft = await this.getDraftSchedule(productionId);
    const day = await this.prisma.shootDay.findFirst({
      where: { id: dayId, scheduleId: draft.id },
    });
    if (!day) throw new NotFoundException(`Shoot day ${dayId} not found`);

    return this.prisma.shootDay.delete({ where: { id: dayId } });
  }

  async assignScene(
    productionId: string,
    shootDayId: string,
    sceneId: string,
  ): Promise<any> {
    const draft = await this.getDraftSchedule(productionId);
    const [day, scene] = await Promise.all([
      this.prisma.shootDay.findFirst({ where: { id: shootDayId, scheduleId: draft.id } }),
      this.prisma.scene.findFirst({ where: { id: sceneId, productionId, deletedAt: null } }),
    ]);

    if (!day) throw new NotFoundException(`Shoot day ${shootDayId} not found`);
    if (!scene) throw new NotFoundException(`Scene ${sceneId} not found`);

    const maxEntry = await this.prisma.sceneSchedule.findFirst({
      where: { shootDayId },
      orderBy: { order: 'desc' },
    });
    const order = (maxEntry?.order ?? -1) + 1;

    return this.prisma.sceneSchedule.upsert({
      where: { sceneId },
      create: { shootDayId, sceneId, order },
      update: { shootDayId, order },
    });
  }

  async removeScene(
    productionId: string,
    shootDayId: string,
    sceneId: string,
  ): Promise<any> {
    const draft = await this.getDraftSchedule(productionId);
    const day = await this.prisma.shootDay.findFirst({
      where: { id: shootDayId, scheduleId: draft.id },
    });
    if (!day) throw new NotFoundException(`Shoot day ${shootDayId} not found`);

    const entry = await this.prisma.sceneSchedule.findFirst({
      where: { shootDayId, sceneId },
    });
    if (!entry) throw new NotFoundException(`Scene not scheduled for this day`);

    return this.prisma.sceneSchedule.delete({ where: { id: entry.id } });
  }

  async reorderScenes(
    productionId: string,
    shootDayId: string,
    sceneIds: string[],
  ): Promise<any> {
    const draft = await this.getDraftSchedule(productionId);
    const day = await this.prisma.shootDay.findFirst({
      where: { id: shootDayId, scheduleId: draft.id },
    });
    if (!day) throw new NotFoundException(`Shoot day ${shootDayId} not found`);

    await this.prisma.$transaction(
      sceneIds.map((sceneId, index) =>
        this.prisma.sceneSchedule.updateMany({
          where: { shootDayId, sceneId },
          data: { order: index },
        }),
      ),
    );

    return { ok: true };
  }

  async getVersions(productionId: string): Promise<any> {
    const versions = await this.prisma.schedule.findMany({
      where: { productionId, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      include: {
        _count: {
          select: { shootDays: true }
        }
      }
    });

    const userIds = [...new Set(versions.map(v => v.publishedBy).filter(Boolean))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: { id: true, name: true, email: true }
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return versions.map(v => ({
      ...v,
      publisher: v.publishedBy ? userMap.get(v.publishedBy) : null
    }));
  }

  async publishSchedule(productionId: string, versionLabel: string, userId: string): Promise<any> {
    const draft = await this.getDraftSchedule(productionId);

    const shootDays = await this.prisma.shootDay.findMany({
      where: { scheduleId: draft.id },
      include: {
        scenes: {
          include: {
            scene: { select: { sceneNumber: true } }
          }
        }
      }
    });

    if (shootDays.length === 0) {
      throw new Error("Cannot publish an empty schedule.");
    }

    const prevPublished = await this.prisma.schedule.findFirst({
      where: { productionId, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      include: {
        shootDays: {
          include: {
            scenes: {
              include: {
                scene: { select: { sceneNumber: true } }
              }
            }
          }
        }
      }
    });

    let changeSummary: string[] = [];
    if (prevPublished) {
      changeSummary = this.diffSchedules(prevPublished.shootDays, shootDays);
    } else {
      changeSummary = ["Initial schedule published."];
    }

    // Publish current draft
    const publishedSchedule = await this.prisma.schedule.update({
      where: { id: draft.id },
      data: {
        status: 'PUBLISHED',
        versionLabel,
        publishedAt: new Date(),
        publishedBy: userId,
        diffFromId: prevPublished?.id ?? null,
        changeSummary
      }
    });

    // Clone a new Draft
    const newDraft = await this.prisma.schedule.create({
      data: {
        productionId,
        versionLabel: 'Draft',
        status: 'DRAFT',
      }
    });

    for (const day of shootDays) {
      const newDay = await this.prisma.shootDay.create({
        data: {
          scheduleId: newDraft.id,
          dayNumber: day.dayNumber,
          date: day.date,
          notes: day.notes
        }
      });

      if (day.scenes.length > 0) {
        await this.prisma.sceneSchedule.createMany({
          data: day.scenes.map(s => ({
            shootDayId: newDay.id,
            sceneId: s.sceneId,
            order: s.order
          }))
        });
      }
    }

    await this.activity.log({
      productionId,
      entityType: 'SCHEDULE',
      entityId: publishedSchedule.id,
      entityName: versionLabel,
      action: 'PUBLISHED',
      actorId: userId,
      metadata: { versionLabel, changeSummary },
    }).catch(() => {});

    return publishedSchedule;
  }

  private diffSchedules(oldDays: any[], newDays: any[]): string[] {
    const changes: string[] = [];

    const oldScenesMap = new Map();
    oldDays.forEach(day => {
      day.scenes.forEach((s: any) => oldScenesMap.set(s.sceneId, { dayNumber: day.dayNumber, sceneNumber: s.scene.sceneNumber }));
    });

    const newScenesMap = new Map();
    newDays.forEach(day => {
      day.scenes.forEach((s: any) => newScenesMap.set(s.sceneId, { dayNumber: day.dayNumber, sceneNumber: s.scene.sceneNumber }));
    });

    newDays.forEach(newDay => {
      newDay.scenes.forEach((s: any) => {
        const oldInfo = oldScenesMap.get(s.sceneId);
        if (!oldInfo) {
          changes.push(`Scene ${s.scene.sceneNumber} added to Shoot Day ${newDay.dayNumber}`);
        } else if (oldInfo.dayNumber !== newDay.dayNumber) {
          changes.push(`Scene ${s.scene.sceneNumber} moved from Shoot Day ${oldInfo.dayNumber} to Shoot Day ${newDay.dayNumber}`);
        }
      });
    });

    oldDays.forEach(oldDay => {
      oldDay.scenes.forEach((s: any) => {
        if (!newScenesMap.has(s.sceneId)) {
          changes.push(`Scene ${s.scene.sceneNumber} removed from Shoot Day ${oldDay.dayNumber}`);
        }
      });
    });

    const oldDaysMap = new Map(oldDays.map(d => [d.dayNumber, d]));
    newDays.forEach(newDay => {
      const oldDay = oldDaysMap.get(newDay.dayNumber);
      if (oldDay) {
        if (oldDay.date?.getTime() !== newDay.date?.getTime()) {
          changes.push(`Shoot Day ${newDay.dayNumber} date changed`);
        }
      } else {
        changes.push(`Shoot Day ${newDay.dayNumber} added`);
      }
    });

    if (changes.length === 0) {
      changes.push("No significant changes.");
    }

    return changes;
  }
}
