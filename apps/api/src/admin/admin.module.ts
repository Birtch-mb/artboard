import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminGuard } from '../common/guards/admin.guard';

@Module({
  providers: [AdminService, AdminGuard],
  controllers: [AdminController],
})
export class AdminModule {}
