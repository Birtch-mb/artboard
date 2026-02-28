'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createApiClient } from '@/lib/api-client';
import { Role } from '@artboard/shared';

interface Member {
  id: string;
  role: Role;
  user: { id: string; name: string; email: string };
}

export function MemberRow({
  member,
  productionId,
  token,
  isAD,
  roleLabels,
}: {
  member: Member;
  productionId: string;
  token: string;
  isAD: boolean;
  roleLabels: Record<Role, string>;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(member.role);
  const [loading, setLoading] = useState(false);

  async function handleRoleChange(newRole: Role) {
    setRole(newRole);
    setLoading(true);
    try {
      const client = createApiClient(token);
      await client.patch(`/productions/${productionId}/members/${member.id}`, { role: newRole });
      router.refresh();
    } catch {
      setRole(member.role);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove ${member.user.name} from this production?`)) return;
    setLoading(true);
    try {
      const client = createApiClient(token);
      await client.delete(`/productions/${productionId}/members/${member.id}`);
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <li className="px-5 py-3.5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate">{member.user.name}</p>
        <p className="text-xs text-gray-500 truncate">{member.user.email}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isAD ? (
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as Role)}
            disabled={loading}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Object.entries(roleLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full">
            {roleLabels[role]}
          </span>
        )}

        {role === Role.COORDINATOR && (
          <Link
            href={`/productions/${productionId}/settings/members/${member.id}/visibility`}
            className="text-xs text-blue-400 hover:text-blue-300 px-2.5 py-1.5 bg-blue-950 border border-blue-900 rounded-lg transition-colors"
          >
            Configure Visibility
          </Link>
        )}

        {isAD && (
          <button
            onClick={handleRemove}
            disabled={loading}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 px-2 py-1.5 rounded transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </li>
  );
}
