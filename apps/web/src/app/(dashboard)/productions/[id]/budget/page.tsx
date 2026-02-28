import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { redirect } from 'next/navigation';
import BudgetClient from './BudgetClient';

interface BudgetData {
  lineItems: any[];
  productionTotals: {
    totalBudget: number;
    totalActual: number;
    variance: number;
  };
  vendorSummary: any[];
}

export default async function BudgetPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

  const client = createApiClient(session.accessToken);

  let budgetData: BudgetData;
  let productionName = 'Production';

  try {
    [budgetData, { name: productionName }] = await Promise.all([
      client.get<BudgetData>(`/productions/${params.id}/budget`),
      client.get<{ name: string }>(`/productions/${params.id}`),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
    if (err instanceof ApiError && err.statusCode === 403) {
      return (
        <div className="px-8 py-8 max-w-3xl">
          <h1 className="text-2xl font-bold text-white mb-3">Budget & Actuals</h1>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-8 text-center">
            <p className="text-gray-400 text-sm">
              Budget visibility is not enabled for your role on this production.
            </p>
            <p className="text-gray-600 text-xs mt-2">
              Contact your Art Director to request access.
            </p>
          </div>
        </div>
      );
    }
    // Fallback for other errors — show empty state
    budgetData = {
      lineItems: [],
      productionTotals: { totalBudget: 0, totalActual: 0, variance: 0 },
      vendorSummary: [],
    };
  }

  return <BudgetClient data={budgetData} productionName={productionName} />;
}
