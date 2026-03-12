'use client';

import { useState, useMemo } from 'react';
import { Search, Trash2 } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  productionCount: number;
  roles: Array<{ role: string; productionName: string }>;
}

interface Props {
  initialUsers: UserRow[];
  token: string;
}

interface ConfirmState {
  userId: string;
  userName: string;
  step: 'confirm' | 'deleting';
}

export default function AdminUsersClient({ initialUsers, token }: Props) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q),
    );
  }, [users, search]);

  const handleDeleteClick = (user: UserRow) => {
    setConfirm({ userId: user.id, userName: user.name, step: 'confirm' });
    setError('');
  };

  const handleConfirmDelete = async () => {
    if (!confirm) return;
    setConfirm((c) => c ? { ...c, step: 'deleting' } : null);
    try {
      const res = await fetch(`/api/proxy/admin/users/${confirm.userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete user');
      }
      setUsers((prev) => prev.filter((u) => u.id !== confirm.userId));
      setConfirm(null);
    } catch (e: any) {
      setError(e.message);
      setConfirm((c) => c ? { ...c, step: 'confirm' } : null);
    }
  };

  const ROLE_LABELS: Record<string, string> = {
    ART_DIRECTOR: 'Art Director',
    PRODUCTION_DESIGNER: 'Production Designer',
    COORDINATOR: 'Coordinator',
    SET_DECORATOR: 'Set Decorator',
    LEADMAN: 'Leadman',
    PROPS_MASTER: 'Props Master',
    VIEWER: 'Viewer',
  };

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Productions</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-500 text-sm">
                  No users found.
                </td>
              </tr>
            )}
            {filtered.map((user) => {
              const isConfirming = confirm?.userId === user.id;
              return (
                <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3.5 text-white font-medium">
                    {user.name}
                    {user.isAdmin && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400 border border-blue-800 font-normal">
                        admin
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400">{user.email}</td>
                  <td className="px-5 py-3.5 text-gray-500 tabular-nums">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 tabular-nums">{user.productionCount}</td>
                  <td className="px-5 py-3.5">
                    {user.roles.length === 0 ? (
                      <span className="text-gray-600 text-xs">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((r, i) => (
                          <span key={i} className="text-xs text-gray-400" title={r.productionName}>
                            {ROLE_LABELS[r.role] ?? r.role}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {user.isAdmin ? (
                      <span className="text-xs text-gray-600">Protected</span>
                    ) : isConfirming ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Are you sure?</span>
                        <button
                          onClick={handleConfirmDelete}
                          disabled={confirm?.step === 'deleting'}
                          className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                        >
                          {confirm?.step === 'deleting' ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirm(null)}
                          className="text-xs px-2 py-1 rounded text-gray-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete account
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-600 mt-3">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
