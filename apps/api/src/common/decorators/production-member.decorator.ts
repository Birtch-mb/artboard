import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const ProductionMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as any).productionMember;
  },
);
