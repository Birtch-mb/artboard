import { auth } from '@/lib/auth';
import { createApiClient, ApiError } from '@/lib/api-client';
import { redirect } from 'next/navigation';
import AdminUsersClient from './AdminUsersClient';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.accessToken || session.error === 'RefreshAccessTokenError') {
    redirect('/login');
  }

  let isAdmin = false;
  let users: any[] = [];

  try {
    const client = createApiClient(session.accessToken);
    const [me, usersData] = await Promise.all([
      client.get<any>('/users/me'),
      client.get<any[]>('/admin/users').catch(() => null),
    ]);
    isAdmin = me.isAdmin === true;
    if (!isAdmin) redirect('/productions');
    users = usersData ?? [];
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.statusCode === 401) redirect('/login');
      if (err.statusCode === 403) redirect('/productions');
    }
    redirect('/productions');
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin — User Management</h1>
        <p className="text-gray-400 text-sm mt-1">Manage all registered users on the platform.</p>
      </div>
      <AdminUsersClient initialUsers={users} token={session.accessToken!} />
    </div>
  );
}
