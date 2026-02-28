'use client';

import { useState, useEffect } from 'react';
import { createApiClient } from '@/lib/api-client';
import { X, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MergeLocationModal({
    currentLocationId,
    productionId,
    token,
    onClose,
}: {
    currentLocationId: string;
    productionId: string;
    token: string;
    onClose: () => void;
}) {
    const router = useRouter();
    const [locations, setLocations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string>('');
    const [isMerging, setIsMerging] = useState(false);

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const client = createApiClient(token);
                const data = await client.get<any[]>(`/productions/${productionId}/locations`);
                // Filter out current location from the list
                setLocations(data.filter((loc) => loc.id !== currentLocationId));
            } catch (err) {
                console.error('Failed to load locations', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLocations();
    }, [productionId, currentLocationId, token]);

    const handleMerge = async () => {
        if (!selectedId) return;

        const selectedLocation = locations.find((l) => l.id === selectedId);
        if (!confirm(`Are you sure you want to merge "${selectedLocation?.name}" INTO the current location? The source location will be archived and this action cannot be undone.`)) {
            return;
        }

        setIsMerging(true);
        try {
            const client = createApiClient(token);
            await client.post(`/productions/${productionId}/locations/${currentLocationId}/merge`, {
                mergeFromId: selectedId,
            });
            router.refresh();
            onClose();
        } catch (err: any) {
            alert(err.message || 'Failed to merge locations');
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-xl">
                <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
                    <h2 className="text-lg font-semibold text-white">Merge Location</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-6">
                    <div className="rounded-lg bg-orange-950/30 border border-orange-900/50 p-4 flex gap-3 text-orange-200 text-sm">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-orange-400" />
                        <p>
                            Select a location to merge INTO the current location. The selected location's aliases and sets will be transferred over, and the selected location will be archived.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-neutral-300">
                            Select Source Location
                        </label>
                        {isLoading ? (
                            <div className="h-10 w-full animate-pulse rounded border border-neutral-800 bg-neutral-800/50"></div>
                        ) : (
                            <select
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                                className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            >
                                <option value="">-- Choose a location --</option>
                                {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-neutral-800 bg-neutral-900/50 px-5 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleMerge}
                        disabled={!selectedId || isMerging}
                        className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isMerging ? 'Merging...' : 'Merge'}
                    </button>
                </div>
            </div>
        </div>
    );
}
