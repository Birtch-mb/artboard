'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createApiClient } from '@/lib/api-client';

export type LocationType = 'STUDIO_STAGE' | 'EXTERIOR' | 'VEHICLE' | 'PRACTICAL_INTERIOR' | 'BASE' | 'OTHER';

const LOCATION_TYPE_LABELS: Record<string, string> = {
    STUDIO_STAGE: 'Studio Stage',
    EXTERIOR: 'Exterior',
    VEHICLE: 'Vehicle',
    PRACTICAL_INTERIOR: 'Practical Interior',
    BASE: 'Base',
    OTHER: 'Other',
};

export default function NewLocationForm({
    productionId,
    token,
}: {
    productionId: string;
    token: string;
}) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'STUDIO_STAGE' as LocationType,
        address: '',
        latitude: '',
        longitude: '',
        notes: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const client = createApiClient(token);

            const payload: any = {
                name: formData.name,
                type: formData.type,
            };

            if (formData.address) payload.address = formData.address;
            if (formData.latitude) payload.latitude = parseFloat(formData.latitude);
            if (formData.longitude) payload.longitude = parseFloat(formData.longitude);
            if (formData.notes) payload.notes = formData.notes;

            // Validation
            if (payload.latitude && (payload.latitude < -90 || payload.latitude > 90)) {
                throw new Error('Latitude must be between -90 and 90');
            }
            if (payload.longitude && (payload.longitude < -180 || payload.longitude > 180)) {
                throw new Error('Longitude must be between -180 and 180');
            }

            await client.post(`/productions/${productionId}/locations`, payload);

            // Navigate back to the list page after successful creation
            router.push(`/productions/${productionId}/locations`);
            router.refresh(); // Ensure the server-side fetched data is re-validated
        } catch (err: any) {
            console.error('Failed to create location:', err);
            setError(err.message || 'Failed to create location');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {error && (
                <div className="rounded-md bg-red-900/50 p-4 border border-red-800">
                    <p className="text-sm text-red-200">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <label htmlFor="name" className="text-sm font-medium text-neutral-300">
                        Location Name *
                    </label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        maxLength={200}
                        value={formData.name}
                        onChange={handleChange}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        placeholder="e.g. Wayne Manor"
                    />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                    <label htmlFor="type" className="text-sm font-medium text-neutral-300">
                        Location Type *
                    </label>
                    <select
                        id="type"
                        name="type"
                        required
                        value={formData.type}
                        onChange={handleChange}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    >
                        {Object.keys(LOCATION_TYPE_LABELS).map((key) => (
                            <option key={key} value={key}>
                                {LOCATION_TYPE_LABELS[key]}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                    <label htmlFor="address" className="text-sm font-medium text-neutral-300">
                        Address
                    </label>
                    <input
                        id="address"
                        name="address"
                        type="text"
                        maxLength={500}
                        value={formData.address}
                        onChange={handleChange}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        placeholder="e.g. 1007 Mountain Drive, Gotham"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="latitude" className="text-sm font-medium text-neutral-300">
                        Latitude
                    </label>
                    <input
                        id="latitude"
                        name="latitude"
                        type="number"
                        step="any"
                        min="-90"
                        max="90"
                        value={formData.latitude}
                        onChange={handleChange}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        placeholder="e.g. 40.7128"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="longitude" className="text-sm font-medium text-neutral-300">
                        Longitude
                    </label>
                    <input
                        id="longitude"
                        name="longitude"
                        type="number"
                        step="any"
                        min="-180"
                        max="180"
                        value={formData.longitude}
                        onChange={handleChange}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        placeholder="e.g. -74.0060"
                    />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                    <label htmlFor="notes" className="text-sm font-medium text-neutral-300">
                        Notes
                    </label>
                    <textarea
                        id="notes"
                        name="notes"
                        rows={4}
                        value={formData.notes}
                        onChange={handleChange}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                        placeholder="Any additional details..."
                    />
                </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-neutral-800 pt-6">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-md border border-neutral-700 bg-transparent px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                            Saving...
                        </>
                    ) : (
                        'Create Location'
                    )}
                </button>
            </div>
        </form>
    );
}
