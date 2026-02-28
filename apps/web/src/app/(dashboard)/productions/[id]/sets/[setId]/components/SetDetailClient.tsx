'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { createApiClient } from '@/lib/api-client';
import { MapPin, FolderTree, Upload, X, FileImage, FileSignature, Trash2, Pencil, Plus } from 'lucide-react';

const SET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    IDEATION: { label: 'Ideation', color: 'bg-indigo-900/50 text-indigo-300 border-indigo-800' },
    DESIGN: { label: 'Design', color: 'bg-purple-900/50 text-purple-300 border-purple-800' },
    BUILD: { label: 'Build', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-800' },
    DRESS: { label: 'Dress', color: 'bg-orange-900/50 text-orange-300 border-orange-800' },
    REHEARSAL: { label: 'Rehearsal', color: 'bg-pink-900/50 text-pink-300 border-pink-800' },
    SHOOT: { label: 'Shoot', color: 'bg-red-900/50 text-red-300 border-red-800' },
    STRIKE: { label: 'Strike', color: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
    WRAPPED: { label: 'Wrapped', color: 'bg-green-900/50 text-green-300 border-green-800' },
};

export default function SetDetailClient({
    initialSet,
    productionId,
    isEditingAllowed,
    isAdOrPd,
    availableLocations,
}: {
    initialSet: any;
    productionId: string;
    isEditingAllowed: boolean;
    isAdOrPd: boolean;
    availableLocations: any[];
}) {
    const { data: session } = useSession();
    const router = useRouter();

    const [set, setSetData] = useState(initialSet);
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'PHOTOS' | 'DRAWINGS'>('DETAILS');
    const [photoTab, setPhotoTab] = useState<string>('REFERENCE');

    const [statusUpdating, setStatusUpdating] = useState(false);
    const [locationAdding, setLocationAdding] = useState(false);
    const [selectedLocationId, setSelectedLocationId] = useState('');

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const [ganttPhases, setGanttPhases] = useState<any[]>([]);
    const [assigningPhase, setAssigningPhase] = useState(false);
    const [selectedPhaseId, setSelectedPhaseId] = useState('');
    const [phaseStart, setPhaseStart] = useState('');
    const [phaseEnd, setPhaseEnd] = useState('');

    useEffect(() => {
        const fetchPhases = async () => {
            const client = createApiClient(session?.accessToken as string);
            try {
                const phases: any = await client.get(`/productions/${productionId}/gantt-phases`);
                setGanttPhases(phases || []);
            } catch (err) {
                console.error('Failed to fetch gantt phases', err);
            }
        };
        if (session?.accessToken) fetchPhases();
    }, [session?.accessToken, productionId]);

    const handleEdit = () => {
        setEditName(set.name);
        setEditNotes(set.notes || '');
        setEditError(null);
        setEditing(true);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editName.trim()) return;
        setSaving(true);
        setEditError(null);
        try {
            const client = createApiClient(session?.accessToken as string);
            const updated: any = await client.patch(`/productions/${productionId}/sets/${set.id}`, {
                name: editName.trim(),
                notes: editNotes.trim() || null,
            });
            setSetData({ ...set, name: updated.name, notes: updated.notes });
            setEditing(false);
            router.refresh();
        } catch (err: any) {
            setEditError(err.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    // Scripted aliases
    const [newAlias, setNewAlias] = useState('');
    const [addingAlias, setAddingAlias] = useState(false);
    const [removingAlias, setRemovingAlias] = useState<string | null>(null);

    const handleAddAlias = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAlias.trim()) return;
        setAddingAlias(true);
        try {
            const client = createApiClient(session?.accessToken as string);
            const updated: any = await client.post(`/productions/${productionId}/sets/${set.id}/aliases`, { alias: newAlias.trim() });
            setSetData({ ...set, scriptedAliases: updated.scriptedAliases });
            setNewAlias('');
        } catch (err: any) {
            setError(err.message || 'Failed to add alias');
        } finally {
            setAddingAlias(false);
        }
    };

    const handleRemoveAlias = async (alias: string) => {
        setRemovingAlias(alias);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
            const res = await fetch(`${apiUrl}/productions/${productionId}/sets/${set.id}/aliases`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.accessToken}` },
                body: JSON.stringify({ alias }),
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => null);
                throw new Error(errBody?.message || 'Failed to remove alias');
            }
            const updated = await res.json();
            setSetData({ ...set, scriptedAliases: updated.scriptedAliases });
        } catch (err: any) {
            setError(err.message || 'Failed to remove alias');
        } finally {
            setRemovingAlias(null);
        }
    };

    const handleDeleteSet = async () => {
        setDeleting(true);
        setError(null);
        try {
            const client = createApiClient(session?.accessToken as string);
            await client.delete(`/productions/${productionId}/sets/${set.id}`);
            router.push(`/productions/${productionId}/sets`);
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Failed to delete set');
            setConfirmDelete(false);
        } finally {
            setDeleting(false);
        }
    };

    const handleAssignPhase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPhaseId || !phaseStart || !phaseEnd) return;
        setAssigningPhase(true);
        try {
            const client = createApiClient(session?.accessToken as string);
            await client.post(`/productions/${productionId}/sets/${set.id}/phases`, {
                phaseId: selectedPhaseId,
                startDate: new Date(phaseStart).toISOString(),
                endDate: new Date(phaseEnd).toISOString(),
            });
            const updatedSet = await client.get(`/productions/${productionId}/sets/${set.id}`);
            setSetData(updatedSet);
            setSelectedPhaseId('');
            setPhaseStart('');
            setPhaseEnd('');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Failed to assign phase');
        } finally {
            setAssigningPhase(false);
        }
    };

    const handleRemovePhase = async (phaseId: string) => {
        if (!confirm('Are you sure you want to remove this phase assignment?')) return;
        try {
            const client = createApiClient(session?.accessToken as string);
            await client.delete(`/productions/${productionId}/sets/${set.id}/phases/${phaseId}`);
            const updatedSet = await client.get(`/productions/${productionId}/sets/${set.id}`);
            setSetData(updatedSet);
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Failed to remove phase');
        }
    };

    const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
    const [urlsLoading, setUrlsLoading] = useState(false);

    useEffect(() => {
        if (!set?.files || set.files.length === 0 || !session?.accessToken) {
            setImageUrls({});
            return;
        }

        setUrlsLoading(true);
        const client = createApiClient(session.accessToken as string);

        Promise.allSettled(
            set.files.map(async (file: any) => {
                const { url } = await client.get<{ url: string }>(
                    `/productions/${productionId}/sets/${set.id}/files/${file.id}/url`
                );
                return { id: file.id, url };
            })
        ).then((results) => {
            const map: Record<string, string> = {};
            results.forEach((result) => {
                if (result.status === 'fulfilled') {
                    map[result.value.id] = result.value.url;
                }
            });
            setImageUrls(map);
            setUrlsLoading(false);
        });
    }, [set?.files, session?.accessToken, productionId, set?.id]);

    const handleStatusChange = async (newStatus: string) => {
        if (!isEditingAllowed) return;
        setStatusUpdating(true);
        setError(null);
        try {
            const client = createApiClient(session?.accessToken as string);
            const updated: any = await client.patch(`/productions/${productionId}/sets/${set.id}`, { status: newStatus });
            setSetData({ ...set, status: updated.status });
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Failed to update status');
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleAddLocation = async () => {
        if (!selectedLocationId || !isEditingAllowed) return;
        setLocationAdding(true);
        setError(null);
        try {
            const client = createApiClient(session?.accessToken as string);
            await client.post(`/productions/${productionId}/sets/${set.id}/locations`, { locationId: selectedLocationId });

            router.refresh();
            const updatedSet = await client.get(`/productions/${productionId}/sets/${set.id}`);
            setSetData(updatedSet);
            setSelectedLocationId('');
        } catch (err: any) {
            setError(err.message || 'Failed to add location');
        } finally {
            setLocationAdding(false);
        }
    };

    const handleRemoveLocation = async (locationId: string) => {
        if (!isEditingAllowed) return;
        if (!confirm('Are you sure you want to remove this location from the set?')) return;
        setError(null);
        try {
            const client = createApiClient(session?.accessToken as string);
            await client.delete(`/productions/${productionId}/sets/${set.id}/locations/${locationId}`);
            const updatedSet = await client.get(`/productions/${productionId}/sets/${set.id}`);
            setSetData(updatedSet);
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Failed to remove location');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: string, category?: string) => {
        if (!e.target.files || e.target.files.length === 0 || !isEditingAllowed) return;
        const file = e.target.files[0];

        if (file.size > 25 * 1024 * 1024) {
            setError('File size must be under 25MB');
            return;
        }

        setUploading(true);
        setUploadProgress(10);
        setError(null);

        try {
            const client = createApiClient(session?.accessToken as string);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileType', fileType);
            if (category) {
                formData.append('photoCategory', category);
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/productions/${productionId}/sets/${set.id}/files`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Upload failed');
            }

            const { presignedUploadUrl } = await response.json();
            setUploadProgress(50);

            const s3Response = await fetch(presignedUploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (!s3Response.ok) {
                throw new Error('Failed to upload file to storage');
            }

            setUploadProgress(100);

            const updatedSet = await client.get(`/productions/${productionId}/sets/${set.id}`);
            setSetData(updatedSet);
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Failed to upload file');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (e.target) e.target.value = '';
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        if (!isEditingAllowed) return;
        if (!confirm('Are you sure you want to delete this file?')) return;
        setError(null);
        try {
            const client = createApiClient(session?.accessToken as string);
            await client.delete(`/productions/${productionId}/sets/${set.id}/files/${fileId}`);
            const updatedSet = await client.get(`/productions/${productionId}/sets/${set.id}`);
            setSetData(updatedSet);
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Failed to delete file');
        }
    };

    const photos = set.files.filter((f: any) => f.fileType === 'PICTURE');
    const drawings = set.files.filter((f: any) => f.fileType === 'DRAWING');
    const currentTabPhotos = photos.filter((f: any) => f.photoCategory === photoTab);

    const unassignedLocations = availableLocations.filter(
        (loc) => !set.locations.some((assignedLoc: any) => assignedLoc.id === loc.id)
    );

    return (
        <div className="flex flex-col gap-6 w-full">
            {error && (
                <div className="rounded-md bg-red-900/30 p-3 text-sm text-red-400 border border-red-900/50">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-neutral-400">Status:</span>
                    {isEditingAllowed ? (
                        <select
                            value={set.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            disabled={statusUpdating}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary ${SET_STATUS_LABELS[set.status]?.color || ''}`}
                        >
                            {Object.keys(SET_STATUS_LABELS).map((key) => (
                                <option key={key} value={key} className="bg-neutral-900 text-neutral-200">
                                    {SET_STATUS_LABELS[key].label}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${SET_STATUS_LABELS[set.status]?.color || ''}`}>
                            {SET_STATUS_LABELS[set.status]?.label || set.status}
                        </span>
                    )}
                    {statusUpdating && <span className="text-xs text-neutral-500 animate-pulse">Updating...</span>}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('DETAILS')}
                            className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === 'DETAILS' ? 'bg-brand-primary text-white hover:bg-brand-primary/90' : 'border border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-800'}`}
                        >
                            Details & Locations
                        </button>
                        <button
                            onClick={() => setActiveTab('PHOTOS')}
                            className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === 'PHOTOS' ? 'bg-brand-primary text-white hover:bg-brand-primary/90' : 'border border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-800'}`}
                        >
                            <FileImage className="mr-2 h-4 w-4" />
                            Photos ({photos.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('DRAWINGS')}
                            className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === 'DRAWINGS' ? 'bg-brand-primary text-white hover:bg-brand-primary/90' : 'border border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-800'}`}
                        >
                            <FileSignature className="mr-2 h-4 w-4" />
                            Drawings ({drawings.length})
                        </button>
                    </div>

                    {isEditingAllowed && (
                        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-neutral-700">
                            {!confirmDelete && (
                                <button
                                    onClick={handleEdit}
                                    className="inline-flex items-center justify-center rounded-md p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
                                    title="Edit set"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            )}
                            {isAdOrPd && (
                                confirmDelete ? (
                                    <>
                                        <span className="text-xs text-neutral-400">Delete this set?</span>
                                        <button
                                            onClick={handleDeleteSet}
                                            disabled={deleting}
                                            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium bg-red-700 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                                        >
                                            {deleting ? 'Deleting…' : 'Yes, delete'}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(false)}
                                            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium border border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-800 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setConfirmDelete(true)}
                                        className="inline-flex items-center justify-center rounded-md p-1.5 text-neutral-500 hover:bg-red-900/40 hover:text-red-400 transition-colors"
                                        title="Delete set"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'DETAILS' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 shadow-none">
                            <div className="border-b border-neutral-800 bg-neutral-900/50 p-4 rounded-t-xl flex flex-row items-center justify-between w-full">
                                <div>
                                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-neutral-400" />
                                        Locations
                                    </h3>
                                </div>
                                {isEditingAllowed && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selectedLocationId}
                                            onChange={(e) => setSelectedLocationId(e.target.value)}
                                            className="h-8 rounded-md border border-neutral-700 bg-neutral-950 px-2 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-primary max-w-[150px]"
                                        >
                                            <option value="">Select location...</option>
                                            {unassignedLocations.map(loc => (
                                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAddLocation}
                                            disabled={!selectedLocationId || locationAdding}
                                            className="inline-flex items-center justify-center rounded-md px-3 h-8 text-xs font-medium transition-colors bg-neutral-800 hover:bg-neutral-700 text-white disabled:pointer-events-none disabled:opacity-50"
                                        >
                                            Add
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="p-0">
                                {set.locations.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-neutral-500">
                                        No locations assigned to this set yet.
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-neutral-800">
                                        {set.locations.map((loc: any) => (
                                            <li key={loc.id} className="flex items-center justify-between p-4 hover:bg-neutral-800/30">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-800 text-neutral-400">
                                                        <MapPin className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-neutral-200 text-sm">{loc.name}</p>
                                                        <p className="text-xs text-neutral-500">{loc.type.replace('_', ' ')}</p>
                                                    </div>
                                                </div>
                                                {isEditingAllowed && (
                                                    <button
                                                        onClick={() => handleRemoveLocation(loc.id)}
                                                        className="text-neutral-500 hover:text-red-400 p-1 rounded-md transition-colors"
                                                        title="Remove Location"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 shadow-none">
                            <div className="border-b border-neutral-800 bg-neutral-900/50 p-4 rounded-t-xl">
                                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                    <FolderTree className="h-5 w-5 text-neutral-400" />
                                    Child Sets
                                </h3>
                            </div>
                            <div className="p-0">
                                {set.children.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-neutral-500">
                                        {set.level >= 3 ? 'Maximum nesting level reached (Level 3).' : 'No child sets currently.'}
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-neutral-800">
                                        {set.children.map((child: any) => (
                                            <li key={child.id} className="flex items-center justify-between p-4 hover:bg-neutral-800/30 cursor-pointer" onClick={() => router.push(`/productions/${productionId}/sets/${child.id}`)}>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-800 text-neutral-400">
                                                        <FolderTree className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-neutral-200 text-sm">{child.name}</p>
                                                        <p className="text-xs text-neutral-500">Level {child.level} • {child.locationCount} Location{child.locationCount !== 1 && 's'}</p>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SET_STATUS_LABELS[child.status as string]?.color || ''}`}>
                                                    {SET_STATUS_LABELS[child.status as string]?.label || child.status}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-span-1 flex flex-col gap-6">
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 shadow-none flex flex-col">
                            <div className="border-b border-neutral-800 bg-neutral-900/50 p-4 rounded-t-xl shrink-0">
                                <h3 className="text-base font-medium text-white">Scripted Aliases</h3>
                                <p className="text-xs text-neutral-500 mt-0.5">Names used for this set in the script</p>
                            </div>
                            <div className="p-4 flex flex-col gap-3">
                                {(set.scriptedAliases || []).length === 0 ? (
                                    <p className="text-sm text-neutral-500 italic">No aliases added yet.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {(set.scriptedAliases || []).map((alias: string) => (
                                            <div
                                                key={alias}
                                                className="flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800 py-1 pl-3 pr-1 text-sm text-neutral-200"
                                            >
                                                <span>{alias}</span>
                                                {isEditingAllowed && (
                                                    <button
                                                        onClick={() => handleRemoveAlias(alias)}
                                                        disabled={removingAlias === alias}
                                                        className="rounded-full p-1 text-neutral-500 hover:bg-neutral-700 hover:text-white transition-colors disabled:opacity-50"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {isEditingAllowed && (
                                    <form onSubmit={handleAddAlias} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="e.g. INT. COFFEE SHOP"
                                            value={newAlias}
                                            onChange={(e) => setNewAlias(e.target.value)}
                                            disabled={addingAlias}
                                            className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm text-white placeholder:text-neutral-600 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
                                        />
                                        <button
                                            type="submit"
                                            disabled={addingAlias || !newAlias.trim()}
                                            className="flex items-center gap-1 rounded-md bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 transition-colors disabled:opacity-50"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 shadow-none flex flex-col">
                            <div className="border-b border-neutral-800 bg-neutral-900/50 p-4 rounded-t-xl shrink-0">
                                <h3 className="text-base font-medium text-white">Gantt Phases</h3>
                                <p className="text-xs text-neutral-500 mt-0.5">Timeline phases assigned to this set</p>
                            </div>
                            <div className="p-4 flex flex-col gap-3">
                                {(set.ganttPhases || []).length === 0 ? (
                                    <p className="text-sm text-neutral-500 italic">No phases assigned.</p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {(set.ganttPhases || []).map((setPhase: any) => (
                                            <div
                                                key={setPhase.id}
                                                className="flex flex-col gap-1 rounded border border-neutral-700 bg-neutral-800 p-2 text-sm text-neutral-200"
                                                style={{ borderLeftColor: setPhase.phase.color, borderLeftWidth: '4px' }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-white">{setPhase.phase.name}</span>
                                                    {isEditingAllowed && (
                                                        <button
                                                            onClick={() => handleRemovePhase(setPhase.phaseId)}
                                                            className="rounded-full p-1 text-neutral-500 hover:bg-neutral-700 hover:text-white transition-colors"
                                                            title="Remove Phase"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="text-xs text-neutral-400">
                                                    {new Date(setPhase.startDate).toLocaleDateString()} - {new Date(setPhase.endDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {isEditingAllowed && ganttPhases.length > 0 && (
                                    <form onSubmit={handleAssignPhase} className="flex flex-col gap-2 mt-2 pt-2 border-t border-neutral-800">
                                        <select
                                            value={selectedPhaseId}
                                            onChange={(e) => setSelectedPhaseId(e.target.value)}
                                            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                            required
                                        >
                                            <option value="">Select a phase...</option>
                                            {ganttPhases.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={phaseStart}
                                                onChange={(e) => setPhaseStart(e.target.value)}
                                                required
                                                title="Start Date"
                                                className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                            />
                                            <input
                                                type="date"
                                                value={phaseEnd}
                                                onChange={(e) => setPhaseEnd(e.target.value)}
                                                required
                                                min={phaseStart}
                                                title="End Date"
                                                className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={assigningPhase || !selectedPhaseId || !phaseStart || !phaseEnd}
                                            className="w-full flex items-center justify-center gap-1 rounded-md bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 transition-colors disabled:opacity-50"
                                        >
                                            {assigningPhase ? 'Assigning...' : 'Assign Phase'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 shadow-none flex flex-col max-h-[400px]">
                            <div className="border-b border-neutral-800 bg-neutral-900/50 p-4 rounded-t-xl shrink-0">
                                <h3 className="text-lg font-medium text-white flex items-center gap-2">Notes</h3>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 text-sm text-neutral-300 whitespace-pre-wrap">
                                {set.notes || <span className="text-neutral-500 italic">No notes provided.</span>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'PHOTOS' && (
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex overflow-x-auto gap-2 pb-2">
                            {['REFERENCE', 'IN_PROGRESS', 'FINAL', 'ON_SET'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setPhotoTab(cat)}
                                    className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${photoTab === cat ? 'bg-brand-primary text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                                        }`}
                                >
                                    {cat.replace('_', ' ')}
                                    <span className="ml-1.5 opacity-60">({photos.filter((p: any) => p.photoCategory === cat).length})</span>
                                </button>
                            ))}
                        </div>
                        {isEditingAllowed && (
                            <div className="relative">
                                <input
                                    type="file"
                                    id="photo-upload"
                                    className="hidden"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => handleFileUpload(e, 'PICTURE', photoTab)}
                                    disabled={uploading}
                                />
                                <label
                                    htmlFor="photo-upload"
                                    className={`flex items-center gap-2 rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Upload className="h-4 w-4" />
                                    {uploading ? `Uploading ${uploadProgress}%` : 'Upload Photo'}
                                </label>
                            </div>
                        )}
                    </div>

                    {currentTabPhotos.length === 0 ? (
                        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-700 bg-neutral-900/50">
                            <div className="text-center">
                                <FileImage className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
                                <p className="text-sm font-medium text-neutral-400">No {photoTab.replace('_', ' ').toLowerCase()} photos</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {currentTabPhotos.map((photo: any) => (
                                <div key={photo.id} className="group relative aspect-square rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        {urlsLoading ? (
                                            <div className="h-full w-full animate-pulse bg-neutral-800" />
                                        ) : imageUrls[photo.id] ? (
                                            <img src={imageUrls[photo.id]} alt={photo.filename} className="h-full w-full object-cover" />
                                        ) : (
                                            <FileImage className="h-8 w-8 text-neutral-700" />
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                                        {isEditingAllowed && (
                                            <button
                                                onClick={() => handleDeleteFile(photo.id)}
                                                className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                    <span className="absolute bottom-0 inset-x-0 p-2 text-[10px] bg-black/80 text-white truncate z-10">
                                        {photo.filename}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {editing && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
                    onClick={() => { if (!saving) setEditing(false); }}
                >
                    <div
                        className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                            <h3 className="text-base font-semibold text-white">Edit Set</h3>
                            <button
                                onClick={() => setEditing(false)}
                                disabled={saving}
                                className="text-neutral-500 hover:text-neutral-200 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="flex flex-col gap-4 p-6">
                            {editError && (
                                <div className="rounded-md bg-red-900/30 p-3 text-sm text-red-400 border border-red-900/50">
                                    {editError}
                                </div>
                            )}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                                    Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    required
                                    maxLength={200}
                                    disabled={saving}
                                    className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
                                    placeholder="Set name"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">Notes</label>
                                <textarea
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    rows={4}
                                    disabled={saving}
                                    className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50 resize-none"
                                    placeholder="Optional notes…"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    disabled={saving}
                                    className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium border border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-800 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !editName.trim()}
                                    className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {saving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'DRAWINGS' && (
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-medium text-white">Drawings & Technical Documents</h2>
                        {isEditingAllowed && (
                            <div className="relative">
                                <input
                                    type="file"
                                    id="drawing-upload"
                                    className="hidden"
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    onChange={(e) => handleFileUpload(e, 'DRAWING')}
                                    disabled={uploading}
                                />
                                <label
                                    htmlFor="drawing-upload"
                                    className={`flex items-center gap-2 rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Upload className="h-4 w-4" />
                                    {uploading ? `Uploading ${uploadProgress}%` : 'Upload Drawing'}
                                </label>
                            </div>
                        )}
                    </div>

                    {drawings.length === 0 ? (
                        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-700 bg-neutral-900/50">
                            <div className="text-center">
                                <FileSignature className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
                                <p className="text-sm font-medium text-neutral-400">No drawings uploaded</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {drawings.map((drawing: any) => (
                                <div key={drawing.id} className="flex items-center justify-between p-4 rounded-lg border border-neutral-800 bg-neutral-900 group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-800 text-neutral-400">
                                            {drawing.mimeType === 'application/pdf' ? <FileSignature className="h-5 w-5 text-blue-400" /> : <FileImage className="h-5 w-5" />}
                                        </div>
                                        <div className="min-w-0">
                                            {imageUrls[drawing.id] ? (
                                                <a href={imageUrls[drawing.id]} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-primary hover:underline truncate block">{drawing.filename}</a>
                                            ) : (
                                                <p className="text-sm font-medium text-neutral-200 truncate">{drawing.filename}</p>
                                            )}
                                            <p className="text-xs text-neutral-500">{(drawing.size / 1024 / 1024).toFixed(2)} MB • {new Date(drawing.uploadedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    {isEditingAllowed && (
                                        <button
                                            onClick={() => handleDeleteFile(drawing.id)}
                                            className="text-neutral-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
