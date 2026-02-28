import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { Role } from '../common/types';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async invite(productionId: string, dto: InviteMemberDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException(`No user found with email: ${dto.email}`);
    }

    const existing = await this.prisma.productionMember.findUnique({
      where: {
        productionId_userId: { productionId, userId: user.id },
      },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this production');
    }

    return this.prisma.productionMember.create({
      data: {
        productionId,
        userId: user.id,
        role: dto.role,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findAll(productionId: string) {
    return this.prisma.productionMember.findMany({
      where: { productionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        coordinatorVisibility: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateRole(productionId: string, memberId: string, dto: UpdateMemberRoleDto) {
    const member = await this.prisma.productionMember.findFirst({
      where: { id: memberId, productionId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this production');
    }

    const updated = await this.prisma.productionMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // If role changed away from COORDINATOR, remove visibility config
    if (member.role === Role.COORDINATOR && dto.role !== Role.COORDINATOR) {
      await this.prisma.coordinatorVisibility.deleteMany({
        where: { productionMemberId: memberId },
      });
    }

    return updated;
  }

  async remove(productionId: string, memberId: string) {
    const member = await this.prisma.productionMember.findFirst({
      where: { id: memberId, productionId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this production');
    }

    // Cascade delete visibility if coordinator
    if (member.role === Role.COORDINATOR) {
      await this.prisma.coordinatorVisibility.deleteMany({
        where: { productionMemberId: memberId },
      });
    }

    await this.prisma.productionMember.delete({ where: { id: memberId } });
    return { message: 'Member removed' };
  }
}
