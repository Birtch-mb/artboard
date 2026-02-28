import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { GanttService } from './gantt.service';
import { CreateGanttPhaseDto } from './dto/create-gantt-phase.dto';
import { UpdateGanttPhaseDto } from './dto/update-gantt-phase.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/types';

@Controller('productions/:productionId/gantt-phases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GanttController {
    constructor(private readonly ganttService: GanttService) { }

    @Post()
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    create(@Param('productionId') productionId: string, @Body() createGanttPhaseDto: CreateGanttPhaseDto) {
        return this.ganttService.create(productionId, createGanttPhaseDto);
    }

    @Get()
    findAll(@Param('productionId') productionId: string) {
        return this.ganttService.findAll(productionId);
    }

    @Patch(':id')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    update(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Body() updateGanttPhaseDto: UpdateGanttPhaseDto,
    ) {
        return this.ganttService.update(productionId, id, updateGanttPhaseDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    remove(@Param('productionId') productionId: string, @Param('id') id: string) {
        return this.ganttService.remove(productionId, id);
    }
}
