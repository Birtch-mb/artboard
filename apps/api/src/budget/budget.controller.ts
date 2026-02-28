import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { ProductionMember } from '../common/decorators/production-member.decorator';

@UseGuards(JwtAuthGuard, ProductionMemberGuard)
@Controller('productions/:productionId/budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  getProductionBudget(
    @Param('productionId') productionId: string,
    @ProductionMember() member: any,
  ) {
    return this.budgetService.getProductionBudget(productionId, member);
  }
}
