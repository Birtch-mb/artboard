import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { ScenesController } from './scenes.controller';
import { ScenesService } from './scenes.service';

@Module({
    imports: [PrismaModule],
    controllers: [ScenesController],
    providers: [ScenesService, ProductionMemberGuard],
})
export class ScenesModule { }
