import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { signOut } from '@/lib/auth';
import Link from 'next/link';
import { createApiClient } from '@/lib/api-client';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  let isAdmin = false;
  if (session.accessToken) {
    try {
      const me = await createApiClient(session.accessToken).get<any>('/users/me');
      isAdmin = me.isAdmin === true;
    } catch {
      // ignore — isAdmin stays false
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-3 flex items-center justify-between">
        <Link href="/productions" className="text-white font-bold tracking-tight text-lg hover:text-blue-300 transition-colors">
          Artboard
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/settings" className="text-sm text-gray-400 hover:text-white transition-colors">
            Settings
          </Link>
          {isAdmin && (
            <Link href="/admin" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Admin
            </Link>
          )}
          <span className="text-sm text-gray-400">{session.user?.name}</span>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
