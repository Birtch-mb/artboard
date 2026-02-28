'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createApiClient } from '@/lib/api-client';
import { Role } from '@artboard/shared';

export function InviteMemberForm({ productionId, token }: { productionId: string; token: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(Role.VIEWER);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const client = createApiClient(token);
      await client.post(`/productions/${productionId}/members`, { email, role });
      setEmail('');
      setRole(Role.VIEWER);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
      {error && (
        <div className="w-full p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="team@studio.com"
        className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3.5 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3.5 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      >
        <option value="ART_DIRECTOR">Art Director</option>
        <option value="PRODUCTION_DESIGNER">Production Designer</option>
        <option value="COORDINATOR">Coordinator</option>
        <option value="SET_DECORATOR">Set Decorator</option>
        <option value="LEADMAN">Leadman</option>
        <option value="PROPS_MASTER">Props Master</option>
        <option value="VIEWER">Viewer</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? 'Inviting…' : 'Invite'}
      </button>
    </form>
  );
}
