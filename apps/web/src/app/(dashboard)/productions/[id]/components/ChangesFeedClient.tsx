'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSocket } from '@/lib/socket-client';

interface FeedItem {
  id: string;
  productionId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  actor: { id: string; name: string } | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  isUnread: boolean;
  notificationId: string | null;
  urgency: string | null;
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'script', label: 'Script' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'assets', label: 'Assets' },
  { id: 'sets', label: 'Sets' },
] as const;

type FilterId = 'all' | 'script' | 'schedule' | 'assets' | 'sets';

function getEntityLink(productionId: string, entityType: string): string {
  switch (entityType) {
    case 'SCRIPT':
    case 'SCENE':
      return `/productions/${productionId}/script`;
    case 'SCHEDULE':
    case 'SHOOT_DAY':
      return `/productions/${productionId}/schedule`;
    case 'ASSET':
      return `/productions/${productionId}/assets`;
    case 'SET':
      return `/productions/${productionId}/sets`;
    default:
      return `/productions/${productionId}`;
  }
}

function formatFeedItem(item: FeedItem): string {
  const actorName = item.actor?.name ?? 'Someone';
  const meta = item.metadata ?? {};

  switch (`${item.entityType}/${item.action}`) {
    case 'SCRIPT/UPLOADED':
    case 'SCRIPT/FLAGGED': {
      const count = meta.flaggedSceneCount ?? 0;
      const flagText =
        count > 0 ? ` · ${count} scene${count !== 1 ? 's' : ''} flagged for review` : '';
      return `New script '${item.entityName}' uploaded by ${actorName}${flagText}`;
    }
    case 'SCHEDULE/PUBLISHED':
      return `Schedule '${item.entityName}' published by ${actorName}`;
    case 'ASSET/CREATED':
      return `${actorName} added asset '${item.entityName}'`;
    case 'ASSET/STATUS_CHANGED': {
      const { oldStatus, newStatus } = meta;
      if (oldStatus && newStatus) {
        return `'${item.entityName}' status: ${oldStatus.replace(/_/g, ' ')} → ${newStatus.replace(/_/g, ' ')}`;
      }
      return `'${item.entityName}' status updated`;
    }
    case 'ASSET/UPDATED':
      return `'${item.entityName}' updated by ${actorName}`;
    case 'ASSET/DELETED':
      return `${actorName} removed asset '${item.entityName}'`;
    case 'SET/CREATED':
      return `${actorName} created set '${item.entityName}'`;
    case 'SET/STATUS_CHANGED': {
      const { oldStatus, newStatus } = meta;
      if (oldStatus && newStatus) {
        return `Set '${item.entityName}': ${oldStatus.replace(/_/g, ' ')} → ${newStatus.replace(/_/g, ' ')}`;
      }
      return `Set '${item.entityName}' status updated`;
    }
    case 'SET/UPDATED':
      return `Set '${item.entityName}' updated`;
    case 'SET/DELETED':
      return `Set '${item.entityName}' removed`;
    case 'SHOOT_DAY/CREATED': {
      const dayNum = meta.dayNumber ?? item.entityName;
      const date = meta.date ? new Date(meta.date).toLocaleDateString() : null;
      return date ? `Shoot day ${dayNum} added for ${date}` : `Shoot day ${dayNum} added`;
    }
    default:
      return `${item.entityType.replace(/_/g, ' ')} ${item.action.toLowerCase()}: ${item.entityName}`;
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface Props {
  initialItems: FeedItem[];
  initialCursor: string | null;
  productionId: string;
  accessToken: string;
}

export default function ChangesFeedClient({
  initialItems,
  initialCursor,
  productionId,
  accessToken,
}: Props) {
  const [filter, setFilter] = useState<FilterId>('all');
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  const apiBase = '/api/proxy';

  // Socket.io real-time updates
  useEffect(() => {
    const socket = getSocket(accessToken);
    socket.emit('join-production', { productionId });

    const handleActivity = (item: FeedItem) => {
      setItems((prev) => [item, ...prev]);
    };

    socket.on('activity', handleActivity);

    return () => {
      socket.off('activity', handleActivity);
      socket.emit('leave-production', { productionId });
    };
  }, [productionId]);

  const fetchPage = useCallback(
    async (filterValue: FilterId, cursorValue: string | null) => {
      const params = new URLSearchParams({ limit: '20' });
      if (filterValue !== 'all') params.set('type', filterValue);
      if (cursorValue) params.set('cursor', cursorValue);

      const res = await fetch(
        `${apiBase}/productions/${productionId}/feed?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error('Failed to fetch feed');
      return res.json() as Promise<{ items: FeedItem[]; nextCursor: string | null }>;
    },
    [productionId, accessToken, apiBase],
  );

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const data = await fetchPage(filter, cursor);
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, filter, fetchPage]);

  const handleFilterChange = useCallback(
    async (newFilter: FilterId) => {
      setFilter(newFilter);
      setLoading(true);
      try {
        const data = await fetchPage(newFilter, null);
        setItems(data.items);
        setCursor(data.nextCursor);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [fetchPage],
  );

  const needsActionItems = items.filter(
    (item) =>
      item.urgency === 'NEEDS_REVIEW' ||
      (item.entityType === 'SCRIPT' && item.action === 'FLAGGED'),
  );

  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-6">Changes Feed</h1>

      {/* Needs Action panel */}
      {needsActionItems.length > 0 && (
        <div className="mb-6 bg-amber-950/30 border border-amber-800/50 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-amber-300 mb-3">Needs Action</h2>
          <ul className="space-y-2">
            {needsActionItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <span className="text-sm text-amber-100">{formatFeedItem(item)}</span>
                <Link
                  href={getEntityLink(productionId, item.entityType)}
                  className="text-xs text-amber-400 hover:text-amber-300 ml-4 shrink-0"
                >
                  Review →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-800">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleFilterChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${filter === tab.id
                ? 'text-white border-b-2 border-blue-500 -mb-px'
                : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed list */}
      {loading && items.length === 0 ? (
        <div className="text-sm text-gray-500 py-8 text-center">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500 py-8 text-center">No activity yet.</div>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li
              key={item.id}
              className={`rounded-lg px-4 py-3 flex items-start gap-3 transition-colors ${item.isUnread ? 'bg-gray-800/60' : 'hover:bg-gray-900/40'
                }`}
            >
              {item.isUnread ? (
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              ) : (
                <span className="mt-1.5 w-1.5 h-1.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={getEntityLink(productionId, item.entityType)}
                  className="text-sm text-gray-200 hover:text-white leading-snug"
                >
                  {formatFeedItem(item)}
                </Link>
                {item.entityType === 'SCHEDULE' &&
                  item.action === 'PUBLISHED' &&
                  Array.isArray(item.metadata?.changeSummary) &&
                  item.metadata.changeSummary.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {(item.metadata.changeSummary as string[]).slice(0, 3).map(
                        (line: string, i: number) => (
                          <li
                            key={i}
                            className="text-xs text-gray-500 pl-2 border-l border-gray-700"
                          >
                            {line}
                          </li>
                        ),
                      )}
                      {item.metadata.changeSummary.length > 3 && (
                        <li className="text-xs text-gray-600 pl-2">
                          + {item.metadata.changeSummary.length - 3} more
                        </li>
                      )}
                    </ul>
                  )}
              </div>
              <span className="text-xs text-gray-600 shrink-0 mt-0.5">
                {formatRelativeTime(item.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Load more */}
      {cursor && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-gray-300 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
