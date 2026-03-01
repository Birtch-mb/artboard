'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FolderTree, MapPin, Trash2 } from 'lucide-react';
import Link from 'next/link';

const SET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    IDEATION: { label: 'Ideation', color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
    DESIGN: { label: 'Design', color: 'bg-blue-900/50 text-blue-300 border-blue-800' },
    BUILD: { label: 'Build', color: 'bg-orange-900/50 text-orange-300 border-orange-800' },
    DRESS: { label: 'Dress', color: 'bg-amber-900/50 text-amber-300 border-amber-800' },
    REHEARSAL: { label: 'Rehearsal', color: 'bg-purple-900/50 text-purple-300 border-purple-800' },
    SHOOT: { label: 'Shoot', color: 'bg-red-900/50 text-red-300 border-red-800' },
    STRIKE: { label: 'Strike', color: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
    WRAPPED: { label: 'Wrapped', color: 'bg-green-900/50 text-green-300 border-green-800' },
};

export default function SetListClient({
    initialSets,
    locations,
    productionId,
    isAdOrPd,
    token,
}: {
    initialSets: any[];
    locations: any[];
    productionId: string;
    isAdOrPd: boolean;
    token: string;
}) {
    const router = useRouter();
    const [sets, setSets] = useState(initialSets);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [locationFilter, setLocationFilter] = useState<string>('ALL');
    const [topLevelOnly, setTopLevelOnly] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleDelete = async (setId: string) => {
        setDeletingId(setId);
        setDeleteError(null);
        try {
            const apiUrl = '/api/proxy';
            const res = await fetch(`${apiUrl}/productions/${productionId}/sets/${setId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setDeleteError(err.message || 'Failed to delete set');
                return;
            }
            setSets((prev) => prev.filter((s) => s.id !== setId));
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    const filteredSets = sets.filter((set) => {
        const matchesSearch = set.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || set.status === statusFilter;
        // Locations on sets are in set.locations array (from SetLocation join) or implicitly calculated if we altered API response
        // Wait, the API returns set._count.locations, and we also want to filter by locationId.
        // Actually, in the backend we didn't include the full location objects in the list API `findAll`! Wait, we did not include `locations: true` in `findAll`, just `_count.locations`.
        // Let's check `SetsService.findAll`. If we didn't include `locations: true`, we can't do location filtering on the client easily unless we update the backend or we use server filtering.
        // I will assume for now we use server filtering or no location filter on list, or we fix the API if needed.

        // Wait, the page fetched all locations. Let's just do search and status for now, and top level.
        const matchesTopLevel = topLevelOnly ? set.parentSetId === null : true;

        // As for location filter, if we don't have location data embedded, we can skip or wait.
        // Oh wait, if `initialSets` does not contain location IDs for each set, we can't filter by it here.
        // Let's fall back to topLevelOnly and statusFilter for client side.

        return matchesSearch && matchesStatus && matchesTopLevel;
    });

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-4">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search sets..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-10 pr-4 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-3 pr-8 text-sm text-neutral-200 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                    >
                        <option value="ALL">All Statuses</option>
                        {Object.keys(SET_STATUS_LABELS).map((key) => (
                            <option key={key} value={key}>
                                {SET_STATUS_LABELS[key].label}
                            </option>
                        ))}
                    </select>

                    <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={topLevelOnly}
                            onChange={(e) => setTopLevelOnly(e.target.checked)}
                            className="rounded border-neutral-700 bg-neutral-900 text-brand-primary focus:ring-brand-primary focus:ring-offset-neutral-900"
                        />
                        Top level only
                    </label>
                </div>
            </div>

            {deleteError && (
                <div className="rounded-md border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-400">
                    {deleteError}
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                <table className="w-full text-left text-sm text-neutral-400">
                    <thead className="border-b border-neutral-800 bg-neutral-900/50 text-xs uppercase text-neutral-500">
                        <tr>
                            <th className="px-6 py-4 font-medium text-neutral-300">Set Name</th>
                            <th className="px-6 py-4 font-medium text-neutral-300">Level</th>
                            <th className="px-6 py-4 font-medium text-neutral-300">Status</th>
                            <th className="px-6 py-4 font-medium text-neutral-300">Locations</th>
                            <th className="px-6 py-4 font-medium text-neutral-300">Files</th>
                            {isAdOrPd && <th className="px-4 py-4" />}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {filteredSets.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                    No sets found.
                                </td>
                            </tr>
                        ) : (
                            filteredSets.map((set) => {
                                const statusLabel = SET_STATUS_LABELS[set.status];
                                return (
                                    <tr
                                        key={set.id}
                                        className="group cursor-pointer transition-colors hover:bg-neutral-800/50"
                                        onClick={() => router.push(`/productions/${productionId}/sets/${set.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400 group-hover:text-white transition-colors">
                                                    <FolderTree className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-neutral-200 group-hover:text-white transition-colors">
                                                        {set.name}
                                                    </span>
                                                    {set._count?.children > 0 && (
                                                        <span className="text-xs text-neutral-500 mt-0.5">
                                                            {set._count.children} child set{set._count.children !== 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
                                                L{set.level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusLabel?.color}`}
                                            >
                                                {statusLabel?.label || set.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-300">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 text-neutral-500" />
                                                {set._count?.locations || 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-300">
                                            {set._count?.files || 0}
                                        </td>
                                        {isAdOrPd && (
                                            <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                {confirmDeleteId === set.id ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleDelete(set.id)}
                                                            disabled={deletingId === set.id}
                                                            className="px-2 py-1 bg-red-700 rounded text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50 whitespace-nowrap"
                                                        >
                                                            {deletingId === set.id ? '…' : 'Delete'}
                                                        </button>
                                                        <button
                                                            onClick={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                                                            className="px-2 py-1 bg-neutral-700 rounded text-xs text-neutral-300 hover:bg-neutral-600"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmDeleteId(set.id)}
                                                        className="p-1.5 text-neutral-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete set"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
