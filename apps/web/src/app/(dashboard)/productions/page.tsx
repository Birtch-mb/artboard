import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ProductionStatus, Role } from '@/lib/types';
import DeleteProductionButton from './components/DeleteProductionButton';

const STATUS_LABELS: Record<ProductionStatus, string> = {
  PRE_PRODUCTION: 'Pre-Production',
  ACTIVE: 'Active',
  WRAPPING: 'Wrapping',
  WRAPPED: 'Wrapped',
};

const STATUS_COLORS: Record<ProductionStatus, string> = {
  PRE_PRODUCTION: 'bg-yellow-900/50 text-yellow-300 border-yellow-800',
  ACTIVE: 'bg-green-900/50 text-green-300 border-green-800',
  WRAPPING: 'bg-orange-900/50 text-orange-300 border-orange-800',
  WRAPPED: 'bg-gray-800 text-gray-400 border-gray-700',
};

const ROLE_LABELS: Record<Role, string> = {
  ART_DIRECTOR: 'Art Director',
  PRODUCTION_DESIGNER: 'Production Designer',
  COORDINATOR: 'Coordinator',
  SET_DECORATOR: 'Set Decorator',
  LEADMAN: 'Leadman',
  PROPS_MASTER: 'Props Master',
  VIEWER: 'Viewer',
};

interface ProductionListItem {
  id: string;
  name: string;
  status: ProductionStatus;
  startDate: string | null;
  wrapDate: string | null;
  createdAt: string;
  _count: { members: number };
  members: Array<{ role: Role }>;
}

export default async function ProductionsPage() {
  const session = await auth();
  if (!session?.accessToken || session.error === 'RefreshAccessTokenError') {
    redirect('/login');
  }

  let productions: ProductionListItem[];
  try {
    const client = createApiClient(session.accessToken);
    productions = await client.get<ProductionListItem[]>('/productions');
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
    throw err;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Productions</h1>
          <p className="text-gray-400 text-sm mt-1">Your art department productions</p>
        </div>
        <Link
          href="/productions/new"
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Production
        </Link>
      </div>

      {productions.length === 0 ? (
        <div className="text-center py-24 text-gray-500">
          <p className="text-lg font-medium text-gray-400 mb-2">No productions yet</p>
          <p className="text-sm">Create your first production to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productions.map((prod) => {
            const myRole = prod.members[0]?.role;
            const canDelete = myRole === Role.ART_DIRECTOR || myRole === Role.PRODUCTION_DESIGNER;
            return (
              <div key={prod.id} className="relative group">
                <Link
                  href={`/productions/${prod.id}`}
                  className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-white font-semibold text-base group-hover:text-blue-300 transition-colors leading-tight">
                      {prod.name}
                    </h2>
                    <span
                      className={`ml-2 shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[prod.status]}`}
                    >
                      {STATUS_LABELS[prod.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {myRole && (
                      <span className="text-gray-400">{ROLE_LABELS[myRole]}</span>
                    )}
                    <span>{prod._count.members} member{prod._count.members !== 1 ? 's' : ''}</span>
                  </div>
                  {(prod.startDate || prod.wrapDate) && (
                    <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-600 flex gap-3">
                      {prod.startDate && (
                        <span>Start: {new Date(prod.startDate).toLocaleDateString()}</span>
                      )}
                      {prod.wrapDate && (
                        <span>Wrap: {new Date(prod.wrapDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                </Link>
                {canDelete && (
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteProductionButton
                      productionId={prod.id}
                      productionName={prod.name}
                      token={session.accessToken!}
                      mode="soft"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
