'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createApiClient } from '@/lib/api-client';
import { MapPin, Image as ImageIcon, FileText, Trash2, GitMerge, Pencil, Check, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import FileGallery from './FileGallery';
import MergeLocationModal from './MergeLocationModal';
import EditLocationModal from './EditLocationModal';
import Link from 'next/link';

const MapViewSingle = dynamic(() => import('./MapViewSingle'), {
    ssr: false,
    loading: () => <div className="h-48 w-full animate-pulse rounded-lg bg-neutral-900" />,
});

const LOCATION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    STUDIO_STAGE: { label: 'Studio Stage', color: 'bg-purple-900/50 text-purple-300 border-purple-800' },
    EXTERIOR: { label: 'Exterior', color: 'bg-green-900/50 text-green-300 border-green-800' },
    VEHICLE: { label: 'Vehicle', color: 'bg-blue-900/50 text-blue-300 border-blue-800' },
    PRACTICAL_INTERIOR: { label: 'Practical Int', color: 'bg-orange-900/50 text-orange-300 border-orange-800' },
    BASE: { label: 'Base', color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
    OTHER: { label: 'Other', color: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
};

export default function LocationDetailClient({
    initialLocation,
    productionId,
    canEditDetails,
    canEditNotes,
    canUploadFiles,
    canDeleteAndMerge,
    token,
}: {
    initialLocation: any;
    productionId: string;
    canEditDetails: boolean;
    canEditNotes: boolean;
    canUploadFiles: boolean;
    canDeleteAndMerge: boolean;
    token: string;
}) {
    const router = useRouter();
    const [location, setLocation] = useState(initialLocation);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Inline notes editing state
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [notesValue, setNotesValue] = useState(location.notes ?? '');
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    useEffect(() => {
        setLocation(initialLocation);
        if (!isEditingNotes) {
            setNotesValue(initialLocation.notes ?? '');
        }
    }, [initialLocation, isEditingNotes]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) return;
        setIsDeleting(true);
        try {
            const client = createApiClient(token);
            await client.delete(`/productions/${productionId}/locations/${location.id}`);
            router.push(`/productions/${productionId}/locations`);
            router.refresh();
        } catch (err: any) {
            alert(err.message || 'Failed to delete');
            setIsDeleting(false);
        }
    };

    const handleSaveNotes = async () => {
        setIsSavingNotes(true);
        try {
            const client = createApiClient(token);
            const updated = await client.patch<any>(
                `/productions/${productionId}/locations/${location.id}`,
                { notes: notesValue.trim() || null }
            );
            setLocation((prev: any) => ({ ...prev, notes: updated.notes }));
            setNotesValue(updated.notes ?? '');
            setIsEditingNotes(false);
        } catch (err: any) {
            alert(err.message || 'Failed to save notes');
        } finally {
            setIsSavingNotes(false);
        }
    };

    const handleCancelNotes = () => {
        setNotesValue(location.notes ?? '');
        setIsEditingNotes(false);
    };

    const typeConfig = LOCATION_TYPE_LABELS[location.type] || LOCATION_TYPE_LABELS['OTHER'];
    const hasCoordinates = location.latitude && location.longitude;

    const pictures = location.files?.filter((f: any) => f.fileType === 'PICTURE') || [];
    const drawings = location.files?.filter((f: any) => f.fileType === 'DRAWING') || [];

    return (
        <div className="flex flex-col gap-8">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight text-white">{location.name}</h1>
                        <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeConfig.color}`}
                        >
                            {typeConfig.label}
                        </span>
                        {canEditDetails && (
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                            >
                                <Pencil className="h-3 w-3" />
                                Edit
                            </button>
                        )}
                    </div>
                    {location.address && (
                        <div className="flex items-center gap-1.5 text-neutral-400">
                            <MapPin className="h-4 w-4" />
                            <span>{location.address}</span>
                        </div>
                    )}
                </div>

                {canDeleteAndMerge && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMergeModalOpen(true)}
                            className="flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                        >
                            <GitMerge className="h-4 w-4" />
                            Merge Location
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex items-center gap-2 rounded-md border border-red-900/50 bg-red-900/20 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/40"
                        >
                            <Trash2 className="h-4 w-4" />
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column */}
                <div className="flex flex-col gap-6 lg:col-span-2">

                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                        <div className="p-4 border-b border-neutral-800 flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-neutral-400" />
                            <h3 className="text-sm font-semibold text-white">Photos</h3>
                        </div>
                        <div className="p-4">
                            <FileGallery
                                files={pictures}
                                fileCategory="PICTURE"
                                locationId={location.id}
                                productionId={productionId}
                                canUpload={canUploadFiles}
                                canDelete={canDeleteAndMerge}
                                token={token}
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                        <div className="p-4 border-b border-neutral-800 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-neutral-400" />
                            <h3 className="text-sm font-semibold text-white">Drawings</h3>
                        </div>
                        <div className="p-4">
                            <FileGallery
                                files={drawings}
                                fileCategory="DRAWING"
                                locationId={location.id}
                                productionId={productionId}
                                canUpload={canUploadFiles}
                                canDelete={canDeleteAndMerge}
                                token={token}
                            />
                        </div>
                    </div>

                </div>

                {/* Right column */}
                <div className="flex flex-col gap-6">
                    {(hasCoordinates || location.address) && (
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden flex flex-col">
                            <div className="p-1">
                                <MapViewSingle
                                    latitude={location.latitude}
                                    longitude={location.longitude}
                                    address={location.address}
                                />
                            </div>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${hasCoordinates
                                    ? `${location.latitude},${location.longitude}`
                                    : encodeURIComponent(location.address || '')
                                    }`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center justify-center gap-2 bg-neutral-900 py-3 text-sm font-medium text-brand-primary transition-colors hover:bg-neutral-800 ${hasCoordinates ? 'border-t border-neutral-800' : ''}`}
                            >
                                <MapPin className="h-4 w-4" />
                                Open in Google Maps
                            </a>
                        </div>
                    )}

                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                        <div className="p-4 border-b border-neutral-800">
                            <h3 className="text-sm font-semibold text-white">Sets Using This Location</h3>
                        </div>
                        <div className="p-4">
                            {location.sets && location.sets.length > 0 ? (
                                <ul className="flex flex-col gap-2">
                                    {location.sets.map((set: any) => (
                                        <li key={set.id}>
                                            <Link href={`/productions/${productionId}/sets/${set.id}`} className="text-sm text-brand-primary hover:underline">
                                                {set.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-neutral-500">No sets are currently linked to this location.</p>
                            )}
                        </div>
                    </div>

                    {/* Notes panel with inline edit */}
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">Notes</h3>
                            {canEditNotes && !isEditingNotes && (
                                <button
                                    onClick={() => setIsEditingNotes(true)}
                                    className="flex items-center gap-1 rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
                                    aria-label="Edit notes"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="p-4">
                            {isEditingNotes ? (
                                <div className="flex flex-col gap-3">
                                    <textarea
                                        value={notesValue}
                                        onChange={(e) => setNotesValue(e.target.value)}
                                        rows={5}
                                        placeholder="Add notes about this location..."
                                        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none leading-relaxed"
                                        autoFocus
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={handleCancelNotes}
                                            disabled={isSavingNotes}
                                            className="flex items-center gap-1.5 rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800 disabled:opacity-50"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveNotes}
                                            disabled={isSavingNotes}
                                            className="flex items-center gap-1.5 rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50"
                                        >
                                            {isSavingNotes ? (
                                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            ) : (
                                                <Check className="h-3.5 w-3.5" />
                                            )}
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : location.notes ? (
                                <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">{location.notes}</p>
                            ) : (
                                <p className="text-sm text-neutral-500 italic">
                                    {canEditNotes ? 'No notes yet — click the pencil to add some.' : 'No notes provided.'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isMergeModalOpen && (
                <MergeLocationModal
                    currentLocationId={location.id}
                    productionId={productionId}
                    token={token}
                    onClose={() => setIsMergeModalOpen(false)}
                />
            )}

            {isEditModalOpen && (
                <EditLocationModal
                    location={location}
                    productionId={productionId}
                    token={token}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={(updated) => {
                        setLocation((prev: any) => ({ ...prev, ...updated }));
                        setNotesValue(updated.notes ?? '');
                        setIsEditModalOpen(false);
                    }}
                />
            )}
        </div>
    );
}
