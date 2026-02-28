import { Module } from '@nestjs/common';
import { SetsService } from './sets.service';
import { SetsController } from './sets.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [PrismaModule, StorageModule, ActivityModule],
  providers: [SetsService],
  controllers: [SetsController],
})
export class SetsModule { }
