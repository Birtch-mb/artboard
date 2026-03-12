import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductionsService } from './productions.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { JwtPayload, Role } from '../common/types';
import { ProductionMember } from '@prisma/client';

interface AuthRequest extends Request {
  user: JwtPayload;
  productionMember: ProductionMember;
}

@Controller('productions')
@UseGuards(JwtAuthGuard)
export class ProductionsController {
  constructor(private readonly productionsService: ProductionsService) {}

  @Post()
  create(@Body() dto: CreateProductionDto, @Request() req: AuthRequest) {
    return this.productionsService.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.productionsService.findAllForUser(req.user.sub);
  }

  @Get(':id')
  @UseGuards(ProductionMemberGuard)
  findOne(@Param('id') id: string) {
    return this.productionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ProductionMemberGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductionDto,
    @Request() req: AuthRequest,
  ) {
    return this.productionsService.update(id, dto, req.productionMember.role as Role);
  }

  @Delete(':id')
  @UseGuards(ProductionMemberGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.productionsService.softDelete(id, req.productionMember.role as Role);
  }

  @Delete(':id/hard')
  @UseGuards(ProductionMemberGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  hardDelete(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.productionsService.hardDelete(id, req.productionMember.role as Role);
  }
}
