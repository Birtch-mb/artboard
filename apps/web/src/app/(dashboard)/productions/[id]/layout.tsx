import { auth } from '@/lib/auth';
import { createApiClient } from '@/lib/api-client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import NotificationBell from './components/NotificationBell';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '' },
  { label: 'Script', href: '/script' },
  { label: 'Schedule', href: '/schedule' },
  { label: 'Sets', href: '/sets' },
  { label: 'Assets', href: '/assets' },
  { label: 'Characters', href: '/characters' },
  { label: 'Locations', href: '/locations' },
  { label: 'Budget', href: '/budget' },
];

interface Production {
  id: string;
  name: string;
  status: string;
}

export default async function ProductionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.accessToken) return null;

  let production: Production;
  try {
    const client = createApiClient(session.accessToken);
    production = await client.get<Production>(`/productions/${params.id}`);
  } catch {
    notFound();
  }

  return (
    <div className="flex min-h-[calc(100vh-53px)]">
      {/* Sidebar */}
      <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-sidebar-border">
          <Link
            href="/productions"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3"
          >
            <span>←</span>
            <span>All Productions</span>
          </Link>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Production</p>
          <h2 className="text-white font-semibold text-sm leading-tight truncate">{production.name}</h2>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={`/productions/${params.id}${item.href}`}
              className="flex items-center px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-sidebar-hover transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-sidebar-border">
          <div className="flex items-center justify-between px-3 py-1.5">
            <Link
              href={`/productions/${params.id}/settings/members`}
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              Team & Settings
            </Link>
            <NotificationBell
              productionId={params.id}
              accessToken={session.accessToken}
              userId={session.user?.id ?? ''}
            />
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
