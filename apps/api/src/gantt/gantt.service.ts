import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGanttPhaseDto } from './dto/create-gantt-phase.dto';
import { UpdateGanttPhaseDto } from './dto/update-gantt-phase.dto';

@Injectable()
export class GanttService {
    constructor(private prisma: PrismaService) { }

    async create(productionId: string, createGanttPhaseDto: CreateGanttPhaseDto) {
        return this.prisma.ganttPhase.create({
            data: {
                ...createGanttPhaseDto,
                productionId,
            },
        });
    }

    async findAll(productionId: string) {
        return this.prisma.ganttPhase.findMany({
            where: { productionId },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async update(productionId: string, id: string, updateGanttPhaseDto: UpdateGanttPhaseDto) {
        const phase = await this.prisma.ganttPhase.findFirst({
            where: { id, productionId },
        });
        if (!phase) throw new NotFoundException('Gantt Phase not found');

        return this.prisma.ganttPhase.update({
            where: { id },
            data: updateGanttPhaseDto,
        });
    }

    async remove(productionId: string, id: string) {
        const phase = await this.prisma.ganttPhase.findFirst({
            where: { id, productionId },
        });
        if (!phase) throw new NotFoundException('Gantt Phase not found');

        return this.prisma.ganttPhase.delete({
            where: { id },
        });
    }
}
