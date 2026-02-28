import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { redirect, notFound } from 'next/navigation';
import ScheduleClient from './components/ScheduleClient';

export default async function SchedulePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

  let schedule = { shootDays: [], unscheduledScenes: [] };
  let canEdit = false;

  try {
    const client = createApiClient(session.accessToken);
    const production: any = await client.get(`/productions/${params.id}`);
    const myMember = production.members?.find((m: any) => m.user.id === session.user?.id);
    const role = myMember?.role;
    canEdit =
      role === 'ART_DIRECTOR' ||
      role === 'PRODUCTION_DESIGNER' ||
      role === 'COORDINATOR';

    schedule = await client.get(`/productions/${params.id}/schedule`);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
    notFound();
  }

  return (
    <ScheduleClient
      initialSchedule={schedule}
      productionId={params.id}
      canEdit={canEdit}
      token={session.accessToken}
    />
  );
}
