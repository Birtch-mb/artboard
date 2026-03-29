'use client';

import { useState, useMemo } from 'react';

interface LineItem {
  assetId: string;
  assetName: string;
  department: string;
  subDepartment: string | null;
  sourceVendor: string | null;
  budgetCost: number;
  actualCost: number;
  variance: number;
  status: string;
  setNames: string[];
}

interface VendorSummary {
  vendor: string;
  totalBudget: number;
  totalActual: number;
  variance: number;
}

interface BudgetData {
  lineItems: LineItem[];
  productionTotals: {
    totalBudget: number;
    totalActual: number;
    variance: number;
  };
  vendorSummary: VendorSummary[];
}

const DEPT_LABELS: Record<string, string> = {
  PROPS:        'Props',
  SET_DEC:      'Set Dec',
  GRAPHICS:     'Graphics',
  SPFX:         'SPFX',
  CONSTRUCTION: 'Construction',
  PICTURE_CARS: 'Picture Cars',
  OTHER:        'Other',
};

const DEPT_ORDER = ['PROPS', 'SET_DEC', 'GRAPHICS', 'SPFX', 'CONSTRUCTION', 'PICTURE_CARS', 'OTHER'];

interface Department {
  key: string;
  name: string;
  assets: LineItem[];
  totalBudget: number;
  totalActual: number;
  variance: number;
}

function buildDepartments(lineItems: LineItem[]): Department[] {
  const map = new Map<string, LineItem[]>();
  for (const item of lineItems) {
    const existing = map.get(item.department) ?? [];
    existing.push(item);
    map.set(item.department, existing);
  }
  const depts: Department[] = [];
  for (const key of DEPT_ORDER) {
    const assets = map.get(key);
    if (!assets || assets.length === 0) continue;
    const totalBudget = assets.reduce((s, a) => s + a.budgetCost, 0);
    const totalActual = assets.reduce((s, a) => s + a.actualCost, 0);
    depts.push({ key, name: DEPT_LABELS[key] ?? key, assets, totalBudget, totalActual, variance: totalActual - totalBudget });
  }
  return depts;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function varianceColor(n: number): string {
  if (n > 0) return 'text-red-400';   // over budget
  if (n < 0) return 'text-green-400'; // under budget
  return 'text-gray-400';
}

function exportCsv(departments: Department[], productionTotals: BudgetData['productionTotals'], vendorSummary: VendorSummary[], productionName: string) {
  const rows: string[][] = [
    ['Department', 'Asset', 'Sets', 'Vendor', 'Budget', 'Actual', 'Variance', 'Status'],
  ];

  for (const dept of departments) {
    for (const item of dept.assets) {
      rows.push([
        dept.name,
        item.assetName,
        item.setNames.join(', '),
        item.sourceVendor ?? '',
        item.budgetCost.toFixed(2),
        item.actualCost.toFixed(2),
        item.variance.toFixed(2),
        item.status.replace(/_/g, ' '),
      ]);
    }
    rows.push([
      dept.name + ' TOTAL', '', '', '',
      dept.totalBudget.toFixed(2),
      dept.totalActual.toFixed(2),
      dept.variance.toFixed(2),
      '',
    ]);
    rows.push([]);
  }

  rows.push([
    'PRODUCTION TOTAL', '', '', '',
    productionTotals.totalBudget.toFixed(2),
    productionTotals.totalActual.toFixed(2),
    productionTotals.variance.toFixed(2),
    '',
  ]);

  if (vendorSummary.length > 0) {
    rows.push([]);
    rows.push(['VENDOR SUMMARY', '', '', '', '', '', '', '']);
    rows.push(['Vendor', '', '', '', 'Budget', 'Actual', 'Variance', '']);
    for (const v of vendorSummary) {
      rows.push([v.vendor, '', '', '', v.totalBudget.toFixed(2), v.totalActual.toFixed(2), v.variance.toFixed(2), '']);
    }
  }

  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${productionName.replace(/[^a-z0-9]/gi, '_')}_budget.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  data: BudgetData;
  productionName: string;
}

export default function BudgetClient({ data, productionName }: Props) {
  const departments = useMemo(() => buildDepartments(data.lineItems), [data.lineItems]);

  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(
    new Set(departments.map((d) => d.key)),
  );

  const toggleDept = (key: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasAnyAssets = departments.length > 0;

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Budget & Actuals</h1>
        <button
          onClick={() => exportCsv(departments, data.productionTotals, data.vendorSummary, productionName)}
          className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-md transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Production totals banner */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Budget', value: data.productionTotals.totalBudget, color: 'text-white' },
          { label: 'Total Actual', value: data.productionTotals.totalActual, color: 'text-white' },
          {
            label: 'Variance',
            value: data.productionTotals.variance,
            color: varianceColor(data.productionTotals.variance),
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-xl font-bold tabular-nums ${stat.color}`}>{fmt(stat.value)}</p>
          </div>
        ))}
      </div>

      {/* Department sections */}
      {!hasAnyAssets ? (
        <p className="text-sm text-gray-500">No assets added yet.</p>
      ) : (
        <div className="space-y-3">
          {departments.map((dept) => (
            <div key={dept.key} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Department header */}
              <button
                onClick={() => toggleDept(dept.key)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">{dept.name}</span>
                  <span className="text-xs text-gray-500">
                    {dept.assets.length} item{dept.assets.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="text-sm font-medium text-white tabular-nums">{fmt(dept.totalBudget)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Actual</p>
                    <p className="text-sm font-medium text-white tabular-nums">{fmt(dept.totalActual)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Variance</p>
                    <p className={`text-sm font-medium tabular-nums ${varianceColor(dept.variance)}`}>
                      {dept.variance >= 0 ? '+' : ''}{fmt(dept.variance)}
                    </p>
                  </div>
                  <span className="text-gray-600 text-xs ml-2">
                    {expandedDepts.has(dept.key) ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {/* Line items */}
              {expandedDepts.has(dept.key) && (
                <div className="border-t border-gray-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800/60">
                        <th className="text-left px-5 py-2 text-xs font-medium text-gray-600">Asset</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Set(s)</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Vendor</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">Budget</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">Actual</th>
                        <th className="text-right px-5 py-2 text-xs font-medium text-gray-600">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {dept.assets.map((item) => (
                        <tr key={item.assetId} className="hover:bg-gray-800/20 transition-colors">
                          <td className="px-5 py-2.5 text-gray-300 font-medium">{item.assetName}</td>
                          <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[160px]">
                            {item.setNames.length > 0
                              ? item.setNames.join(', ')
                              : <span className="text-gray-700">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 text-xs">
                            {item.sourceVendor ?? <span className="text-gray-700">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-400 tabular-nums">
                            {item.budgetCost > 0 ? fmt(item.budgetCost) : <span className="text-gray-700">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-400 tabular-nums">
                            {item.actualCost > 0 ? fmt(item.actualCost) : <span className="text-gray-700">—</span>}
                          </td>
                          <td className={`px-5 py-2.5 text-right tabular-nums ${varianceColor(item.variance)}`}>
                            {item.budgetCost > 0 || item.actualCost > 0
                              ? `${item.variance >= 0 ? '+' : ''}${fmt(item.variance)}`
                              : <span className="text-gray-700">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Vendor summary */}
      {data.vendorSummary.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-white mb-3">Vendor Summary</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Vendor</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-gray-500">Budget</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-gray-500">Actual</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {data.vendorSummary.map((v) => (
                  <tr key={v.vendor} className="hover:bg-gray-800/20 transition-colors">
                    <td className="px-5 py-2.5 text-gray-300 font-medium">{v.vendor}</td>
                    <td className="px-3 py-2.5 text-right text-gray-400 tabular-nums">{fmt(v.totalBudget)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-400 tabular-nums">{fmt(v.totalActual)}</td>
                    <td className={`px-5 py-2.5 text-right tabular-nums ${varianceColor(v.variance)}`}>
                      {v.variance >= 0 ? '+' : ''}{fmt(v.variance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
