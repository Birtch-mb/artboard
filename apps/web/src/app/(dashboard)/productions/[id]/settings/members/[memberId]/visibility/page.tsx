import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { VisibilityForm } from './visibility-form';

interface Visibility {
  productionMemberId: string;
  showScript: boolean;
  showSchedule: boolean;
  showSets: boolean;
  showAssets: boolean;
  showLocations: boolean;
  showBudget: boolean;
}

export default async function VisibilityPage({
  params,
}: {
  params: { id: string; memberId: string };
}) {
  const session = await auth();
  if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

  let visibility: Visibility;
  try {
    const client = createApiClient(session.accessToken);
    visibility = await client.get<Visibility>(
      `/productions/${params.id}/members/${params.memberId}/visibility`,
    );
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
    notFound();
  }

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/productions/${params.id}/settings/members`}
          className="text-sm text-gray-500 hover:text-gray-300"
        >
          ← Back to team settings
        </Link>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h1 className="text-xl font-bold text-white mb-1">Coordinator Visibility</h1>
        <p className="text-sm text-gray-500 mb-6">
          Control which sections this coordinator can see.
        </p>

        <VisibilityForm
          productionId={params.id}
          memberId={params.memberId}
          token={session.accessToken!}
          initial={visibility}
        />
      </div>
    </div>
  );
}
