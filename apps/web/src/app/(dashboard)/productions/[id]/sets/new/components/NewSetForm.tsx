'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createApiClient } from '@/lib/api-client';

const SET_STATUS_LABELS: Record<string, string> = {
    IDEATION: 'Ideation',
    DESIGN: 'Design',
    BUILD: 'Build',
    DRESS: 'Dress',
    REHEARSAL: 'Rehearsal',
    SHOOT: 'Shoot',
    STRIKE: 'Strike',
    WRAPPED: 'Wrapped',
};

export default function NewSetForm({
    productionId,
    availableParents,
}: {
    productionId: string;
    availableParents: any[];
}) {
    const router = useRouter();
    const { data: session } = useSession();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [status, setStatus] = useState<string>('IDEATION');
    const [parentSetId, setParentSetId] = useState('');
    const [notes, setNotes] = useState('');

    // Only sets with level 1 or 2 can have children (max 3 levels)
    const validParents = availableParents.filter(
        (set) => set.level === 1 || set.level === 2
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!session?.accessToken) throw new Error('Not authenticated');
            const client = createApiClient(session.accessToken);

            const payload: any = {
                name,
                status,
                notes: notes || undefined,
            };

            if (parentSetId) {
                payload.parentSetId = parentSetId;
            }

            const newSet: any = await client.post(`/productions/${productionId}/sets`, payload);

            // Redirect to the new set list or detail page
            router.push(`/productions/${productionId}/sets/${newSet.id}`);
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Failed to create set');
            setLoading(false);
        }
    };

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 shadow-none">
            <div className="border-b border-neutral-800 bg-neutral-900/50 p-6 rounded-t-xl">
                <h3 className="text-lg font-medium text-white">Set Details</h3>
                <p className="text-sm text-neutral-400 mt-1">
                    Enter the basic information for this new set.
                </p>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="space-y-6 p-6">
                    {error && (
                        <div className="rounded-md bg-red-900/30 p-3 text-sm text-red-400 border border-red-900/50">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium leading-none text-neutral-200">Set Name <span className="text-red-500">*</span></label>
                        <input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Living Room, Main Stage..."
                            required
                            className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="parentSetId" className="text-sm font-medium leading-none text-neutral-200">Parent Set</label>
                        <select
                            id="parentSetId"
                            value={parentSetId}
                            onChange={(e) => setParentSetId(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">None (Top-Level Set)</option>
                            {validParents.map((parent) => (
                                <option key={parent.id} value={parent.id}>
                                    {parent.level === 2 ? '\u00A0\u00A0\u21B3 ' : ''}{parent.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-neutral-500">
                            Organize your sets into a hierarchy (max 3 levels deep).
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="status" className="text-sm font-medium leading-none text-neutral-200">Status</label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {Object.keys(SET_STATUS_LABELS).map((key) => (
                                <option key={key} value={key}>
                                    {SET_STATUS_LABELS[key]}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-neutral-500">
                            Sets normally start in Ideation unless locations are assigned right away.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="notes" className="text-sm font-medium leading-none text-neutral-200">Notes (Optional)</label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any initial notes or context here..."
                            className="flex min-h-[100px] w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
                        />
                    </div>
                </div>
                <div className="border-t border-neutral-800 bg-neutral-900/50 p-6 flex justify-end gap-3 rounded-b-xl">
                    <button
                        type="button"
                        onClick={() => router.push(`/productions/${productionId}/sets`)}
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary disabled:pointer-events-none disabled:opacity-50 border border-neutral-700 bg-transparent hover:bg-neutral-800 hover:text-white px-4 py-2"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !name}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary disabled:pointer-events-none disabled:opacity-50 bg-brand-primary text-white hover:bg-brand-primary/90 px-4 py-2"
                    >
                        {loading ? 'Creating...' : 'Create Set'}
                    </button>
                </div>
            </form>
        </div>
    );
}
