'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createApiClient } from '@/lib/api-client';
import Link from 'next/link';

export default function NewProductionPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [name, setName] = useState('');
  const [status, setStatus] = useState('PRE_PRODUCTION');
  const [startDate, setStartDate] = useState('');
  const [wrapDate, setWrapDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');

    try {
      const client = createApiClient(session.accessToken);
      const prod = await client.post<{ id: string }>('/productions', {
        name,
        status,
        startDate: startDate || undefined,
        wrapDate: wrapDate || undefined,
      });
      router.push(`/productions/${prod.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create production');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Link href="/productions" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← Back to productions
        </Link>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <h1 className="text-xl font-bold text-white mb-6">New Production</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Production name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="e.g. The Grand Picture"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="PRE_PRODUCTION">Pre-Production</option>
              <option value="ACTIVE">Active</option>
              <option value="WRAPPING">Wrapping</option>
              <option value="WRAPPED">Wrapped</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Wrap date
              </label>
              <input
                type="date"
                value={wrapDate}
                onChange={(e) => setWrapDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Creating…' : 'Create production'}
            </button>
            <Link
              href="/productions"
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors text-sm text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
