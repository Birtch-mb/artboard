import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { redirect, notFound } from 'next/navigation';
import ChangesFeedClient from './components/ChangesFeedClient';

interface FeedResponse {
  items: any[];
  nextCursor: string | null;
}

export default async function ProductionPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

  let feedData: FeedResponse;

  try {
    const client = createApiClient(session.accessToken);
    feedData = await client.get<FeedResponse>(`/productions/${params.id}/feed?limit=20`);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
    notFound();
  }

  return (
    <ChangesFeedClient
      initialItems={feedData.items}
      initialCursor={feedData.nextCursor}
      productionId={params.id}
      accessToken={session.accessToken}
    />
  );
}
