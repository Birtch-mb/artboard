'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getSocket } from '@/lib/socket-client';

interface NotificationItem {
  id: string;
  urgency: string;
  readAt: string | null;
  createdAt: string;
  activityLog: {
    id: string;
    entityType: string;
    entityId: string;
    entityName: string;
    action: string;
    actor: { id: string; name: string } | null;
    metadata: Record<string, any> | null;
    createdAt: string;
  } | null;
}

function getNotificationText(n: NotificationItem): string {
  const log = n.activityLog;
  if (!log) return 'New activity';
  const actorName = log.actor?.name ?? 'Someone';
  const meta = log.metadata ?? {};

  switch (`${log.entityType}/${log.action}`) {
    case 'SCRIPT/UPLOADED':
    case 'SCRIPT/FLAGGED': {
      const count = meta.flaggedSceneCount ?? 0;
      return count > 0
        ? `Script '${log.entityName}' — ${count} scene${count !== 1 ? 's' : ''} need review`
        : `New script '${log.entityName}' uploaded`;
    }
    case 'SCHEDULE/PUBLISHED':
      return `Schedule '${log.entityName}' published`;
    case 'ASSET/CREATED':
      return `${actorName} added '${log.entityName}'`;
    case 'ASSET/STATUS_CHANGED': {
      const { newStatus } = meta;
      return `'${log.entityName}' → ${newStatus?.replace(/_/g, ' ') ?? 'updated'}`;
    }
    case 'SHOOT_DAY/CREATED': {
      const dayNum = meta.dayNumber ?? log.entityName;
      return `Shoot day ${dayNum} added`;
    }
    default:
      return `${log.entityName} ${log.action.toLowerCase()}`;
  }
}

function getNotificationLink(productionId: string, n: NotificationItem): string {
  const entityType = n.activityLog?.entityType ?? '';
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

const URGENCY_LABEL: Record<string, string> = {
  URGENT: 'Urgent',
  NEEDS_REVIEW: 'Needs review',
  HIGH: 'High priority',
  NORMAL: '',
};

const URGENCY_COLOR: Record<string, string> = {
  URGENT: 'text-red-400',
  NEEDS_REVIEW: 'text-amber-400',
  HIGH: 'text-orange-400',
  NORMAL: 'text-gray-600',
};

interface Props {
  productionId: string;
  accessToken: string;
  userId: string;
}

export default function NotificationBell({ productionId, accessToken, userId }: Props) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch initial unread count
  useEffect(() => {
    fetch(`${apiBase}/productions/${productionId}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.count ?? 0))
      .catch(() => { });
  }, [productionId, accessToken, apiBase]);

  // Socket.io subscription
  useEffect(() => {
    const socket = getSocket(accessToken);
    const handleNotification = (data: { userId: string; unreadCount: number }) => {
      if (data.userId === userId) {
        setUnreadCount(data.unreadCount);
      }
    };

    socket.on('notification', handleNotification);
    return () => {
      socket.off('notification', handleNotification);
    };
  }, [userId]);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoadingNotifications(true);
    try {
      const res = await fetch(`${apiBase}/productions/${productionId}/notifications`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.slice(0, 10));
      }
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAllRead = async () => {
    await fetch(`${apiBase}/productions/${productionId}/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => { });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-800"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-blue-500 text-white text-xs font-bold rounded-full px-0.5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loadingNotifications ? (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">No notifications</div>
            ) : (
              <ul className="divide-y divide-gray-800/50">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={getNotificationLink(productionId, n)}
                      onClick={() => setOpen(false)}
                      className={`flex items-start gap-2 px-4 py-3 hover:bg-gray-800/40 transition-colors ${!n.readAt ? 'bg-gray-800/20' : ''
                        }`}
                    >
                      {!n.readAt ? (
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      ) : (
                        <span className="mt-1.5 w-1.5 h-1.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs leading-snug ${n.readAt ? 'text-gray-400' : 'text-gray-200'
                            }`}
                        >
                          {getNotificationText(n)}
                        </p>
                        <p className={`text-xs mt-0.5 ${URGENCY_COLOR[n.urgency] ?? 'text-gray-600'}`}>
                          {URGENCY_LABEL[n.urgency] ||
                            new Date(n.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
