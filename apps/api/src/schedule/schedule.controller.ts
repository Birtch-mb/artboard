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
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ScheduleService } from './schedule.service';
import { CreateShootDayDto } from './dto/create-shoot-day.dto';
import { UpdateShootDayDto } from './dto/update-shoot-day.dto';
import { AssignSceneDto } from './dto/assign-scene.dto';
import { ReorderScenesDto } from './dto/reorder-scenes.dto';
import { PublishScheduleDto } from './dto/publish-schedule.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/types';

@Controller('productions/:productionId/schedule')
@UseGuards(JwtAuthGuard, ProductionMemberGuard, RolesGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) { }

  @Get()
  getSchedule(@Param('productionId') productionId: string) {
    return this.scheduleService.findSchedule(productionId);
  }

  @Post('days')
  @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.COORDINATOR)
  createDay(
    @Param('productionId') productionId: string,
    @Body() dto: CreateShootDayDto,
    @CurrentUser() user?: any,
  ) {
    return this.scheduleService.createShootDay(productionId, dto, user?.sub);
  }

  @Patch('days/:dayId')
  @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.COORDINATOR)
  updateDay(
    @Param('productionId') productionId: string,
    @Param('dayId') dayId: string,
    @Body() dto: UpdateShootDayDto,
  ) {
    return this.scheduleService.updateShootDay(productionId, dayId, dto);
  }

  @Delete('days/:dayId')
  @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.COORDINATOR)
  deleteDay(
    @Param('productionId') productionId: string,
    @Param('dayId') dayId: string,
  ) {
    return this.scheduleService.deleteShootDay(productionId, dayId);
  }

  @Post('days/:dayId/scenes')
  @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.COORDINATOR)
  assignScene(
    @Param('productionId') productionId: string,
    @Param('dayId') dayId: string,
    @Body() dto: AssignSceneDto,
  ) {
    return this.scheduleService.assignScene(productionId, dayId, dto.sceneId);
  }

  @Delete('days/:dayId/scenes/:sceneId')
  @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.COORDINATOR)
  removeScene(
    @Param('productionId') productionId: string,
    @Param('dayId') dayId: string,
    @Param('sceneId') sceneId: string,
  ) {
    return this.scheduleService.removeScene(productionId, dayId, sceneId);
  }

  @Patch('days/:dayId/scenes/reorder')
  @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.COORDINATOR)
  reorderScenes(
    @Param('productionId') productionId: string,
    @Param('dayId') dayId: string,
    @Body() dto: ReorderScenesDto,
  ) {
    return this.scheduleService.reorderScenes(productionId, dayId, dto.sceneIds);
  }

  @Get('versions')
  getVersions(@Param('productionId') productionId: string) {
    return this.scheduleService.getVersions(productionId);
  }

  @Post('publish')
  @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER, Role.COORDINATOR)
  publishSchedule(
    @Param('productionId') productionId: string,
    @Body() dto: PublishScheduleDto,
    @Request() req: any,
  ) {
    return this.scheduleService.publishSchedule(productionId, dto.versionLabel, req.user.id);
  }
}
