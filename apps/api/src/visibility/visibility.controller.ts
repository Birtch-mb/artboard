import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VisibilityService } from './visibility.service';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, JwtPayload } from '../common/types';
import { ProductionMember } from '@prisma/client';

interface AuthRequest extends Request {
  user: JwtPayload;
  productionMember: ProductionMember;
}

@Controller('productions/:id/members/:memberId/visibility')
@UseGuards(JwtAuthGuard, ProductionMemberGuard)
export class VisibilityController {
  constructor(private readonly visibilityService: VisibilityService) {}

  @Get()
  getVisibility(
    @Param('id') productionId: string,
    @Param('memberId') memberId: string,
    @Request() req: AuthRequest,
  ) {
    return this.visibilityService.getVisibility(
      productionId,
      memberId,
      req.user.sub,
      req.productionMember.role as Role,
    );
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles(Role.ART_DIRECTOR)
  updateVisibility(
    @Param('id') productionId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateVisibilityDto,
  ) {
    return this.visibilityService.updateVisibility(productionId, memberId, dto);
  }
}
