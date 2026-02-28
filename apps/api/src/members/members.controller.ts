import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/types';
import { ProductionMember } from '@prisma/client';
import { JwtPayload } from '../common/types';

interface AuthRequest extends Request {
  user: JwtPayload;
  productionMember: ProductionMember;
}

@Controller('productions/:id/members')
@UseGuards(JwtAuthGuard, ProductionMemberGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ART_DIRECTOR)
  invite(
    @Param('id') productionId: string,
    @Body() dto: InviteMemberDto,
    @Request() _req: AuthRequest,
  ) {
    return this.membersService.invite(productionId, dto);
  }

  @Get()
  findAll(@Param('id') productionId: string) {
    return this.membersService.findAll(productionId);
  }

  @Patch(':memberId')
  @UseGuards(RolesGuard)
  @Roles(Role.ART_DIRECTOR)
  updateRole(
    @Param('id') productionId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.membersService.updateRole(productionId, memberId, dto);
  }

  @Delete(':memberId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(Role.ART_DIRECTOR)
  remove(
    @Param('id') productionId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.membersService.remove(productionId, memberId);
  }
}
