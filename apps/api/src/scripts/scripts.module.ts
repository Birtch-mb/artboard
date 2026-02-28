import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { ScriptsController } from './scripts.controller';
import { ScriptsService } from './scripts.service';
import { ScreenplayParserService } from './screenplay-parser.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [PrismaModule, StorageModule, ActivityModule],
  controllers: [ScriptsController],
  providers: [ScriptsService, ScreenplayParserService, ProductionMemberGuard],
})
export class ScriptsModule { }
