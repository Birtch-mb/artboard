import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { Role } from '../common/types';

@Injectable()
export class VisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  private async getMember(productionId: string, memberId: string) {
    const member = await this.prisma.productionMember.findFirst({
      where: { id: memberId, productionId },
      include: { coordinatorVisibility: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this production');
    }

    if (member.role !== Role.COORDINATOR) {
      throw new ForbiddenException(
        'Coordinator visibility config only applies to members with COORDINATOR role',
      );
    }

    return member;
  }

  async getVisibility(
    productionId: string,
    memberId: string,
    requestingUserId: string,
    requestingMemberRole: Role,
  ) {
    const member = await this.getMember(productionId, memberId);

    // AD, PD, or the coordinator themselves can view
    const isAdOrPd =
      requestingMemberRole === Role.ART_DIRECTOR ||
      requestingMemberRole === Role.PRODUCTION_DESIGNER;
    const isSelf = member.userId === requestingUserId;

    if (!isAdOrPd && !isSelf) {
      throw new ForbiddenException('You do not have permission to view this visibility config');
    }

    if (!member.coordinatorVisibility) {
      // Return defaults if not yet configured
      return {
        productionMemberId: memberId,
        showScript: true,
        showSchedule: true,
        showSets: true,
        showAssets: true,
        showLocations: true,
        showBudget: false,
      };
    }

    return member.coordinatorVisibility;
  }

  async updateVisibility(
    productionId: string,
    memberId: string,
    dto: UpdateVisibilityDto,
  ) {
    const member = await this.getMember(productionId, memberId);

    return this.prisma.coordinatorVisibility.upsert({
      where: { productionMemberId: memberId },
      update: {
        ...dto,
      },
      create: {
        productionMemberId: memberId,
        showScript: dto.showScript ?? true,
        showSchedule: dto.showSchedule ?? true,
        showSets: dto.showSets ?? true,
        showAssets: dto.showAssets ?? true,
        showLocations: dto.showLocations ?? true,
        showBudget: dto.showBudget ?? false,
      },
    });
  }
}
