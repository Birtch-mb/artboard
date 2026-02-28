'use client';

import { useState } from 'react';
import { createApiClient } from '@/lib/api-client';
import { X } from 'lucide-react';

const LOCATION_TYPE_OPTIONS = [
    { value: 'STUDIO_STAGE', label: 'Studio Stage' },
    { value: 'EXTERIOR', label: 'Exterior' },
    { value: 'VEHICLE', label: 'Vehicle' },
    { value: 'PRACTICAL_INTERIOR', label: 'Practical Interior' },
    { value: 'BASE', label: 'Base' },
    { value: 'OTHER', label: 'Other' },
];

export default function EditLocationModal({
    location,
    productionId,
    token,
    onClose,
    onSave,
}: {
    location: any;
    productionId: string;
    token: string;
    onClose: () => void;
    onSave: (updated: any) => void;
}) {
    const [name, setName] = useState<string>(location.name ?? '');
    const [type, setType] = useState<string>(location.type ?? 'OTHER');
    const [address, setAddress] = useState<string>(location.address ?? '');
    const [latitude, setLatitude] = useState<string>(
        location.latitude != null ? String(location.latitude) : ''
    );
    const [longitude, setLongitude] = useState<string>(
        location.longitude != null ? String(location.longitude) : ''
    );
    const [notes, setNotes] = useState<string>(location.notes ?? '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Location name is required.');
            return;
        }

        const payload: Record<string, any> = {
            name: name.trim(),
            type,
        };

        if (address.trim()) payload.address = address.trim();
        else payload.address = null;

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (latitude.trim() !== '' && !isNaN(lat)) {
            payload.latitude = lat;
        } else {
            payload.latitude = null;
        }

        if (longitude.trim() !== '' && !isNaN(lng)) {
            payload.longitude = lng;
        } else {
            payload.longitude = null;
        }

        if (notes.trim()) payload.notes = notes.trim();
        else payload.notes = null;

        setIsSaving(true);
        try {
            const client = createApiClient(token);
            const updated = await client.patch<any>(
                `/productions/${productionId}/locations/${location.id}`,
                payload
            );
            onSave(updated);
        } catch (err: any) {
            setError(err.message || 'Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const inputClass =
        'w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary';
    const labelClass = 'block text-xs font-medium text-neutral-400 mb-1';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
                    <h2 className="text-lg font-semibold text-white">Edit Location</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

                        {error && (
                            <div className="rounded-md bg-red-950/40 border border-red-900/50 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label className={labelClass}>Name <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={200}
                                required
                                placeholder="e.g. Warehouse District Ext."
                                className={inputClass}
                            />
                        </div>

                        {/* Type */}
                        <div>
                            <label className={labelClass}>Type <span className="text-red-400">*</span></label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className={inputClass}
                            >
                                {LOCATION_TYPE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Address */}
                        <div>
                            <label className={labelClass}>Address</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                maxLength={500}
                                placeholder="e.g. 123 Main St, Los Angeles, CA"
                                className={inputClass}
                            />
                        </div>

                        {/* Lat / Lng */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Latitude</label>
                                <input
                                    type="number"
                                    value={latitude}
                                    onChange={(e) => setLatitude(e.target.value)}
                                    step="any"
                                    min={-90}
                                    max={90}
                                    placeholder="e.g. 34.0522"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Longitude</label>
                                <input
                                    type="number"
                                    value={longitude}
                                    onChange={(e) => setLongitude(e.target.value)}
                                    step="any"
                                    min={-180}
                                    max={180}
                                    placeholder="e.g. -118.2437"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className={labelClass}>Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4}
                                placeholder="Additional notes about this location..."
                                className={`${inputClass} resize-none leading-relaxed`}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-neutral-800 bg-neutral-900/50 px-5 py-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
