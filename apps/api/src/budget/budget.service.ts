import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ProductionMemberContext {
  role: string;
  coordinatorVisibility?: {
    showBudget: boolean;
  } | null;
}

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  private checkAccess(member: ProductionMemberContext): void {
    if (member.role === 'ART_DIRECTOR' || member.role === 'PRODUCTION_DESIGNER') return;
    if (member.role === 'COORDINATOR' && member.coordinatorVisibility?.showBudget) return;
    throw new ForbiddenException('Budget access is not enabled for your role on this production');
  }

  async getProductionBudget(productionId: string, member: ProductionMemberContext): Promise<any> {
    this.checkAccess(member);

    // Fetch all non-deleted production assets with their set context
    const assets = await this.prisma.asset.findMany({
      where: { productionId, deletedAt: null },
      select: {
        id: true,
        name: true,
        department: true,
        subDepartment: true,
        sourceVendor: true,
        budgetCost: true,
        actualCost: true,
        status: true,
        setAssignments: {
          select: {
            set: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build flat line items with set name context
    const lineItems = assets.map((asset) => {
      const budgetCost = asset.budgetCost ? Number(asset.budgetCost) : 0;
      const actualCost = asset.actualCost ? Number(asset.actualCost) : 0;
      return {
        assetId: asset.id,
        assetName: asset.name,
        department: asset.department,
        subDepartment: asset.subDepartment ?? null,
        sourceVendor: asset.sourceVendor ?? null,
        budgetCost,
        actualCost,
        variance: actualCost - budgetCost,
        status: asset.status,
        setNames: asset.setAssignments.map((sa) => sa.set.name),
      };
    });

    // Production totals
    const totalBudget = lineItems.reduce((s, i) => s + i.budgetCost, 0);
    const totalActual = lineItems.reduce((s, i) => s + i.actualCost, 0);

    // Vendor summary
    const vendorMap = new Map<string, { totalBudget: number; totalActual: number }>();
    for (const item of lineItems) {
      const vendor = item.sourceVendor?.trim();
      if (!vendor) continue;
      const existing = vendorMap.get(vendor) ?? { totalBudget: 0, totalActual: 0 };
      existing.totalBudget += item.budgetCost;
      existing.totalActual += item.actualCost;
      vendorMap.set(vendor, existing);
    }

    const vendorSummary = Array.from(vendorMap.entries())
      .map(([vendor, totals]) => ({
        vendor,
        totalBudget: totals.totalBudget,
        totalActual: totals.totalActual,
        variance: totals.totalActual - totals.totalBudget,
      }))
      .sort((a, b) => b.totalActual - a.totalActual);

    return {
      lineItems,
      productionTotals: {
        totalBudget,
        totalActual,
        variance: totalActual - totalBudget,
      },
      vendorSummary,
    };
  }
}
