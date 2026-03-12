'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  productionId: string;
  productionName: string;
  token: string;
  mode: 'soft' | 'hard';
  onDeleted?: () => void;
}

export default function DeleteProductionButton({ productionId, productionName, token, mode, onDeleted }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && mode === 'hard') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, mode]);

  const handleDelete = async () => {
    if (mode === 'hard' && confirmName !== productionName) return;
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'hard'
        ? `/api/proxy/productions/${productionId}/hard`
        : `/api/proxy/productions/${productionId}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete production');
      }
      setOpen(false);
      if (onDeleted) onDeleted();
      else router.push('/productions');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'soft') {
    return (
      <>
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
          className="text-xs text-red-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-950/50"
        >
          Archive
        </button>

        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-white mb-2">Archive Production?</h2>
              <p className="text-sm text-gray-400 mb-4">
                <span className="font-medium text-white">{productionName}</span> will be archived and hidden from your production list.
                You can still access it directly to permanently delete it.
              </p>
              {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-700 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                >
                  {loading ? 'Archiving…' : 'Archive Production'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Hard delete mode
  const nameMatches = confirmName === productionName;
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); setConfirmName(''); setError(''); }}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-red-900/40 border border-red-800 text-red-400 hover:bg-red-800/60 hover:text-red-300 transition-colors"
      >
        Permanently Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div className="bg-gray-900 border border-red-900/50 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-2">Permanently Delete Production?</h2>
            <p className="text-sm text-gray-400 mb-2">
              This will permanently delete <span className="font-medium text-white">{productionName}</span> and{' '}
              <span className="font-semibold text-red-400">all associated data</span> — scripts, scenes, sets, assets, schedules, and more.
            </p>
            <p className="text-sm text-red-400 font-medium mb-4">This action is irreversible and cannot be undone.</p>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1.5">
                Type <span className="font-medium text-white">{productionName}</span> to confirm:
              </label>
              <input
                ref={inputRef}
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && nameMatches && handleDelete()}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-red-600 focus:outline-none"
                placeholder={productionName}
              />
            </div>
            {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || !nameMatches}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-700 hover:bg-red-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
