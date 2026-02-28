import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [PrismaModule, StorageModule, ActivityModule],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule { }
