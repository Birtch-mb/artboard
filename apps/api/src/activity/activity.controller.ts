import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, ProductionMemberGuard)
@Controller('productions/:productionId')
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('feed')
  async getFeed(
    @Param('productionId') productionId: string,
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    const member = await this.prisma.productionMember.findFirst({
      where: { productionId, userId: user.sub },
      include: { coordinatorVisibility: true },
    });

    const coVisibility =
      member?.role === 'COORDINATOR' && member.coordinatorVisibility
        ? {
            showScript: member.coordinatorVisibility.showScript,
            showSchedule: member.coordinatorVisibility.showSchedule,
            showSets: member.coordinatorVisibility.showSets,
            showAssets: member.coordinatorVisibility.showAssets,
            showLocations: member.coordinatorVisibility.showLocations,
            showBudget: member.coordinatorVisibility.showBudget,
          }
        : null;

    return this.activityService.getProductionFeed(
      productionId,
      user.sub,
      member?.role ?? 'VIEWER',
      coVisibility,
      type,
      limit,
      cursor,
    );
  }

  @Get('notifications')
  async getNotifications(
    @Param('productionId') productionId: string,
    @CurrentUser() user: any,
  ) {
    return this.activityService.getUserNotifications(user.sub, productionId);
  }

  @Get('notifications/unread-count')
  async getUnreadCount(
    @Param('productionId') productionId: string,
    @CurrentUser() user: any,
  ) {
    const count = await this.activityService.getUnreadCount(user.sub, productionId);
    return { count };
  }

  @Patch('notifications/:notificationId/read')
  async markRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: any,
  ) {
    await this.activityService.markRead(notificationId, user.sub);
    return { ok: true };
  }

  @Post('notifications/read-all')
  async markAllRead(
    @Param('productionId') productionId: string,
    @CurrentUser() user: any,
  ) {
    return this.activityService.markAllRead(user.sub, productionId);
  }
}
