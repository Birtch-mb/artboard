import { Module } from '@nestjs/common';
import { VisibilityService } from './visibility.service';
import { VisibilityController } from './visibility.controller';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';

@Module({
  providers: [VisibilityService, ProductionMemberGuard],
  controllers: [VisibilityController],
})
export class VisibilityModule {}
