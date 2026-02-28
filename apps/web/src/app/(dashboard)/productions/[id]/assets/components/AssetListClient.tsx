'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Box, ChevronDown } from 'lucide-react';
import Link from 'next/link';

const ASSET_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
    PROPS: { label: 'Props', color: 'bg-blue-900/50 text-blue-300 border-blue-800' },
    SET_DRESSING: { label: 'Set Dressing', color: 'bg-emerald-900/50 text-emerald-300 border-emerald-800' },
    GRAPHICS: { label: 'Graphics', color: 'bg-fuchsia-900/50 text-fuchsia-300 border-fuchsia-800' },
    FURNITURE: { label: 'Furniture', color: 'bg-amber-900/50 text-amber-300 border-amber-800' },
    VEHICLES: { label: 'Vehicles', color: 'bg-indigo-900/50 text-indigo-300 border-indigo-800' },
    EXPENDABLES: { label: 'Expendables', color: 'bg-orange-900/50 text-orange-300 border-orange-800' },
    SOFT_FURNISHINGS: { label: 'Soft Furnishings', color: 'bg-pink-900/50 text-pink-300 border-pink-800' },
    GREENS: { label: 'Greens', color: 'bg-lime-900/50 text-lime-300 border-lime-800' },
    WEAPONS: { label: 'Weapons', color: 'bg-red-900/50 text-red-300 border-red-800' },
    FOOD: { label: 'Food', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-800' },
    ANIMALS: { label: 'Animals', color: 'bg-cyan-900/50 text-cyan-300 border-cyan-800' },
    SPECIAL_EFFECTS: { label: 'Special Effects', color: 'bg-violet-900/50 text-violet-300 border-violet-800' },
    OTHER: { label: 'Other', color: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
};

const ASSET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    IN_SOURCING: { label: 'In Sourcing', color: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
    CONFIRMED: { label: 'Confirmed', color: 'bg-blue-900/50 text-blue-300 border-blue-800' },
    ON_SET: { label: 'On Set', color: 'bg-green-900/50 text-green-300 border-green-800' },
    RETURNED: { label: 'Returned', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-800' },
    STRUCK: { label: 'Struck', color: 'bg-red-900/50 text-red-300 border-red-800' },
};

export default function AssetListClient({
    initialAssets,
    tags,
    sets,
    productionId,
    canSeeBudget,
    token,
}: {
    initialAssets: any[];
    tags: any[];
    sets: any[];
    productionId: string;
    canSeeBudget: boolean;
    token: string;
}) {
    const router = useRouter();
    const [assets, setAssets] = useState(initialAssets);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [setFilter, setSetFilter] = useState<string>('ALL');
    const [tagFilter, setTagFilter] = useState<string[]>([]);

    // Updating status
    const updateStatus = async (assetId: string, newStatus: string) => {
        // Optimistic update
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: newStatus } : a));
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/productions/${productionId}/assets/${assetId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            router.refresh();
        } catch (e) {
            console.error(e);
        }
    };

    const toggleTagFilter = (tagId: string) => {
        setTagFilter(prev =>
            prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
        );
    };

    const filteredAssets = assets.filter((asset) => {
        const matchesSearch = asset.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'ALL' || asset.category === categoryFilter;
        const matchesStatus = statusFilter === 'ALL' || asset.status === statusFilter;
        const matchesSet = setFilter === 'ALL' || asset.sets.some((s: any) => s.id === setFilter);
        const matchesTags = tagFilter.length === 0 || tagFilter.every(tagId => asset.tags.some((t: any) => t.id === tagId));

        return matchesSearch && matchesCategory && matchesStatus && matchesSet && matchesTags;
    });

    return (
        <div className="flex flex-col gap-4">
            {/* Filters Container */}
            <div className="flex flex-col gap-4">
                {/* Top Row: Dropdowns and Search */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative max-w-sm flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-10 pr-4 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                        />
                    </div>

                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-3 pr-8 text-sm text-neutral-200 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                    >
                        <option value="ALL">All Categories</option>
                        {Object.keys(ASSET_CATEGORY_LABELS).map((key) => (
                            <option key={key} value={key}>{ASSET_CATEGORY_LABELS[key].label}</option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-3 pr-8 text-sm text-neutral-200 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                    >
                        <option value="ALL">All Statuses</option>
                        {Object.keys(ASSET_STATUS_LABELS).map((key) => (
                            <option key={key} value={key}>{ASSET_STATUS_LABELS[key].label}</option>
                        ))}
                    </select>

                    <select
                        value={setFilter}
                        onChange={(e) => setSetFilter(e.target.value)}
                        className="rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-3 pr-8 text-sm text-neutral-200 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                    >
                        <option value="ALL">All Sets</option>
                        {sets.map((set) => (
                            <option key={set.id} value={set.id}>{set.name}</option>
                        ))}
                    </select>
                </div>

                {/* Tags Row */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-neutral-500 m-1">Filter Tags (Additive):</span>
                    {tags.map(tag => (
                        <button
                            key={tag.id}
                            onClick={() => toggleTagFilter(tag.id)}
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${tagFilter.includes(tag.id)
                                ? 'border-brand-primary bg-brand-primary/20 text-brand-primary'
                                : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                }`}
                        >
                            {tag.name}
                        </button>
                    ))}
                    {tagFilter.length > 0 && (
                        <button onClick={() => setTagFilter([])} className="text-xs text-neutral-500 hover:text-white ml-2 underline">Clear Tags</button>
                    )}
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                <table className="w-full text-left text-sm text-neutral-400">
                    <thead className="border-b border-neutral-800 bg-neutral-900/50 text-xs uppercase text-neutral-500">
                        <tr>
                            <th className="px-6 py-4 font-medium text-neutral-300">Asset</th>
                            <th className="px-6 py-4 font-medium text-neutral-300">Category</th>
                            <th className="px-6 py-4 font-medium text-neutral-300 hidden md:table-cell">Tags</th>
                            <th className="px-6 py-4 font-medium text-neutral-300 hidden sm:table-cell">Sets</th>
                            <th className="px-6 py-4 font-medium text-neutral-300">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {filteredAssets.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                    No assets found.
                                </td>
                            </tr>
                        ) : (
                            filteredAssets.map((asset) => {
                                const categoryLabel = ASSET_CATEGORY_LABELS[asset.category];
                                const statusLabel = ASSET_STATUS_LABELS[asset.status];
                                const visibleTags = asset.tags.slice(0, 3);
                                const hiddenTagsCount = asset.tags.length - 3;

                                return (
                                    <tr
                                        key={asset.id}
                                        className="group transition-colors hover:bg-neutral-800/50"
                                    >
                                        <td className="px-6 py-4 cursor-pointer" onClick={() => router.push(`/productions/${productionId}/assets/${asset.id}`)}>
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400 group-hover:text-white transition-colors">
                                                    <Box className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-neutral-200 group-hover:text-white transition-colors">
                                                        {asset.name}
                                                    </span>
                                                    {asset.quantity > 1 && (
                                                        <span className="text-xs text-neutral-500 mt-0.5">
                                                            Qty: {asset.quantity}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 cursor-pointer" onClick={() => router.push(`/productions/${productionId}/assets/${asset.id}`)}>
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${categoryLabel?.color || 'bg-neutral-800 text-neutral-400 border-neutral-700'}`}>
                                                {categoryLabel?.label || asset.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell cursor-pointer" onClick={() => router.push(`/productions/${productionId}/assets/${asset.id}`)}>
                                            <div className="flex flex-wrap gap-1">
                                                {visibleTags.map((tag: any) => (
                                                    <span key={tag.id} className="inline-flex rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-0.5 text-[10px] text-neutral-300 whitespace-nowrap">
                                                        {tag.name}
                                                    </span>
                                                ))}
                                                {hiddenTagsCount > 0 && (
                                                    <span className="inline-flex rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-500">
                                                        +{hiddenTagsCount}
                                                    </span>
                                                )}
                                                {asset.tags.length === 0 && <span className="text-neutral-600">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell text-neutral-300">
                                            {asset.sets?.length || 0}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={asset.status}
                                                onChange={(e) => updateStatus(asset.id, e.target.value)}
                                                className={`appearance-none bg-transparent outline-none cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-semibold pr-4 font-sans ${statusLabel?.color || 'text-neutral-400'}`}
                                            >
                                                {Object.entries(ASSET_STATUS_LABELS).map(([key, val]) => (
                                                    <option key={key} value={key} className="bg-neutral-900 text-white">{val.label}</option>
                                                ))}
                                            </select>
                                        </td>
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
