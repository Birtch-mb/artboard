import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Role } from '@/lib/types';
import { InviteMemberForm } from './invite-form';
import { MemberRow } from './member-row';
import { GanttSettings } from './gantt-settings';

const ROLE_LABELS: Record<Role, string> = {
  ART_DIRECTOR: 'Art Director',
  PRODUCTION_DESIGNER: 'Production Designer',
  COORDINATOR: 'Coordinator',
  SET_DECORATOR: 'Set Decorator',
  LEADMAN: 'Leadman',
  PROPS_MASTER: 'Props Master',
  VIEWER: 'Viewer',
};

interface Member {
  id: string;
  role: Role;
  user: { id: string; name: string; email: string };
}

export default async function MembersSettingsPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.accessToken || session.error === 'RefreshAccessTokenError') redirect('/login');

  let members: Member[];
  try {
    const client = createApiClient(session.accessToken);
    members = await client.get<Member[]>(`/productions/${params.id}/members`);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) redirect('/login');
    notFound();
  }

  const myMember = members.find((m) => m.user.id === session.user?.id);
  const isAD = myMember?.role === Role.ART_DIRECTOR;

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href={`/productions/${params.id}`} className="text-sm text-gray-500 hover:text-gray-300">
          ← Back to production
        </Link>
      </div>

      <h1 className="text-xl font-bold text-white mb-6">Team & Access</h1>

      {isAD && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-4">Invite team member</h2>
          <InviteMemberForm productionId={params.id} token={session.accessToken!} />
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </h2>
        </div>
        <ul className="divide-y divide-gray-800">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              productionId={params.id}
              token={session.accessToken!}
              isAD={isAD}
              roleLabels={ROLE_LABELS}
            />
          ))}
        </ul>
      </div>

      {isAD && <GanttSettings productionId={params.id} token={session.accessToken!} />}
    </div>
  );
}
