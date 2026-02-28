'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Map as MapIcon, List, MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

export type LocationType = 'STUDIO_STAGE' | 'EXTERIOR' | 'VEHICLE' | 'PRACTICAL_INTERIOR' | 'BASE' | 'OTHER';

// Dynamically import MapView to prevent SSR issues with leaflet
const MapView = dynamic(() => import('./MapView').then((mod) => mod.default), {
    ssr: false,
    loading: () => (
        <div className="flex h-[500px] w-full items-center justify-center rounded-md border border-neutral-800 bg-neutral-900/50">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        </div>
    ),
});

const LOCATION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    STUDIO_STAGE: { label: 'Studio Stage', color: 'bg-purple-900/50 text-purple-300 border-purple-800' },
    EXTERIOR: { label: 'Exterior', color: 'bg-green-900/50 text-green-300 border-green-800' },
    VEHICLE: { label: 'Vehicle', color: 'bg-blue-900/50 text-blue-300 border-blue-800' },
    PRACTICAL_INTERIOR: { label: 'Practical Int', color: 'bg-orange-900/50 text-orange-300 border-orange-800' },
    BASE: { label: 'Base', color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
    OTHER: { label: 'Other', color: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
};

export default function LocationListClient({
    initialLocations,
    productionId,
}: {
    initialLocations: any[];
    productionId: string;
}) {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');

    const filteredLocations = initialLocations.filter((loc) => {
        const matchesSearch = loc.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'ALL' || loc.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const hasCoordinates = filteredLocations.some((l) => l.latitude && l.longitude);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-4">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-10 pr-4 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                        />
                    </div>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-3 pr-8 text-sm text-neutral-200 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                    >
                        <option value="ALL">All Types</option>
                        {Object.keys(LOCATION_TYPE_LABELS).map((key) => (
                            <option key={key} value={key}>
                                {LOCATION_TYPE_LABELS[key].label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center rounded-md border border-neutral-800 bg-neutral-900 p-1">
                    <button
                        onClick={() => setViewMode('LIST')}
                        className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'LIST'
                            ? 'bg-neutral-800 text-white'
                            : 'text-neutral-400 hover:text-white'
                            }`}
                    >
                        <List className="h-4 w-4" />
                        List
                    </button>
                    <button
                        onClick={() => setViewMode('MAP')}
                        className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'MAP'
                            ? 'bg-neutral-800 text-white'
                            : 'text-neutral-400 hover:text-white'
                            }`}
                    >
                        <MapIcon className="h-4 w-4" />
                        Map
                    </button>
                </div>
            </div>

            {viewMode === 'LIST' ? (
                <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                    <table className="w-full text-left text-sm text-neutral-400">
                        <thead className="border-b border-neutral-800 bg-neutral-900/50 text-xs uppercase text-neutral-500">
                            <tr>
                                <th className="px-6 py-4 font-medium text-neutral-300">Location</th>
                                <th className="px-6 py-4 font-medium text-neutral-300">Type</th>
                                <th className="px-6 py-4 font-medium text-neutral-300">Sets</th>
                                <th className="px-6 py-4 font-medium text-neutral-300">Files</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {filteredLocations.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                                        No locations found.
                                    </td>
                                </tr>
                            ) : (
                                filteredLocations.map((loc) => {
                                    const typeLabel = LOCATION_TYPE_LABELS[loc.type];
                                    return (
                                        <tr
                                            key={loc.id}
                                            className="group cursor-pointer transition-colors hover:bg-neutral-800/50"
                                            onClick={() => router.push(`/productions/${productionId}/locations/${loc.id}`)}
                                        >
                                            <td className="px-6 py-4">
                                                <Link
                                                    href={`/productions/${productionId}/locations/${loc.id}`}
                                                    className="flex items-start gap-3"
                                                >
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400 group-hover:text-white transition-colors">
                                                        <MapPin className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-neutral-200 group-hover:text-white transition-colors">
                                                            {loc.name}
                                                        </span>
                                                        {loc.address && (
                                                            <span className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                                                                {loc.address}
                                                            </span>
                                                        )}
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeLabel?.color}`}
                                                >
                                                    {typeLabel?.label || loc.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {loc.setLocations
                                                        ?.filter((sl: any) => !sl.set?.deletedAt)
                                                        .map((sl: any) => (
                                                            <span
                                                                key={sl.set.id}
                                                                className="inline-flex rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300"
                                                            >
                                                                {sl.set.name}
                                                            </span>
                                                        ))}
                                                    {(!loc.setLocations || loc.setLocations.filter((sl: any) => !sl.set?.deletedAt).length === 0) && (
                                                        <span className="text-neutral-600">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-300">
                                                {loc._count?.files || 0}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <MapView locations={filteredLocations} productionId={productionId} />
            )}
        </div>
    );
}
