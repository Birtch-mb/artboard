import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';

@Module({
  providers: [MembersService, ProductionMemberGuard],
  controllers: [MembersController],
})
export class MembersModule {}
