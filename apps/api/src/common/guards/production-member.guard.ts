import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../types';
import { Request } from 'express';

@Injectable()
export class ProductionMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user: JwtPayload; productionMember: unknown }>();
    const user = request.user as JwtPayload;
    const rawId = request.params['productionId'] || request.params['id'];
    const productionId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!productionId) {
      return true;
    }

    const production = await this.prisma.production.findUnique({
      where: { id: productionId },
    });

    if (!production) {
      throw new NotFoundException('Production not found');
    }

    const member = await this.prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId,
          userId: user.sub,
        },
      },
      include: { coordinatorVisibility: true },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this production');
    }

    request.productionMember = member;
    return true;
  }
}
