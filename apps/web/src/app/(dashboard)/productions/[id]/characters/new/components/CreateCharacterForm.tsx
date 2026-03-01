'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CreateCharacterForm({
    productionId,
    token,
}: {
    productionId: string;
    token: string;
}) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [height, setHeight] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || submitting) return;
        setSubmitting(true);
        setError('');

        try {
            const apiUrl = '/api/proxy';
            const res = await fetch(`${apiUrl}/productions/${productionId}/characters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    height: height.trim() || undefined,
                    notes: notes.trim() || undefined,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setError(err.message || 'Failed to create character');
                return;
            }

            const created = await res.json();
            router.push(`/productions/${productionId}/characters/${created.id}`);
        } catch {
            setError('Failed to create character');
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls =
        'w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50';
    const labelCls = 'block text-sm font-medium text-neutral-300 mb-1';

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className={labelCls}>
                    Name <span className="text-red-400">*</span>
                </label>
                <input
                    autoFocus
                    type="text"
                    placeholder="e.g. John Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                    required
                />
            </div>

            <div>
                <label className={labelCls}>Height</label>
                <input
                    type="text"
                    placeholder="e.g. 5′10″"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className={inputCls}
                />
                <p className="mt-1 text-xs text-neutral-500">Used for costume sizing reference</p>
            </div>

            <div>
                <label className={labelCls}>Notes</label>
                <textarea
                    rows={4}
                    placeholder="Any notes about this character…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${inputCls} resize-none`}
                />
            </div>

            {error && (
                <p className="rounded-md border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-400">
                    {error}
                </p>
            )}

            <div className="flex items-center gap-3 pt-1">
                <button
                    type="submit"
                    disabled={submitting || !name.trim()}
                    className="rounded-md bg-brand-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Creating…' : 'Create Character'}
                </button>
                <Link
                    href={`/productions/${productionId}/characters`}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                >
                    Cancel
                </Link>
            </div>
        </form>
    );
}
