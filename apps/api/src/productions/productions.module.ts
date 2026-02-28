import { Module } from '@nestjs/common';
import { ProductionsService } from './productions.service';
import { ProductionsController } from './productions.controller';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';

@Module({
  providers: [ProductionsService, ProductionMemberGuard],
  controllers: [ProductionsController],
  exports: [ProductionsService],
})
export class ProductionsModule {}
