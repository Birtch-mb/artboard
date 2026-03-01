'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createApiClient } from '@/lib/api-client';
import { Trash2, Edit2, Upload, Plus, AlertTriangle, Link as LinkIcon, Camera } from 'lucide-react';
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

export default function AssetDetailClient({
    asset: initialAsset,
    allTags,
    allSets,
    productionId,
    isAdOrPd,
    canEdit,
    canSeeBudget,
    token
}: any) {
    const router = useRouter();
    const [asset, setAsset] = useState(initialAsset);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingNotes, setEditingNotes] = useState(false);
    const [notesTemp, setNotesTemp] = useState(asset.notes || '');
    const [addingTag, setAddingTag] = useState('');
    const [addingSet, setAddingSet] = useState('');
    const [editingFinancials, setEditingFinancials] = useState(false);
    const [financialsTemp, setFinancialsTemp] = useState({
        budgetCost: asset.budgetCost ?? '',
        actualCost: asset.actualCost ?? '',
        sourceVendor: asset.sourceVendor ?? '',
    });

    // Conditionally render budget variance if both are present
    const variance = (asset.actualCost !== null && asset.budgetCost !== null)
        ? parseFloat(asset.actualCost) - parseFloat(asset.budgetCost)
        : null;

    const client = createApiClient(token);

    // File URLs state
    const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
    const [continuityFileUrls, setContinuityFileUrls] = useState<Record<string, string>>({});

    useEffect(() => {
        // Fetch Asset Photos URLs
        if (asset.files?.length) {
            Promise.allSettled(
                asset.files.map(async (f: any) => {
                    const { url } = await client.get<{ url: string }>(
                        `/productions/${productionId}/assets/${asset.id}/files/${f.id}/url`
                    );
                    return { id: f.id, url };
                })
            ).then((results) => {
                const map: Record<string, string> = {};
                results.forEach((res) => {
                    if (res.status === 'fulfilled') map[res.value.id] = res.value.url;
                });
                setFileUrls(map);
            });
        }

        // Fetch Continuity Photos URLs
        if (asset.continuityEvents?.length) {
            const allContFiles = asset.continuityEvents.flatMap((ev: any) => ev.files || []);
            if (allContFiles.length > 0) {
                Promise.allSettled(
                    allContFiles.map(async (f: any) => {
                        const { url } = await client.get<{ url: string }>(
                            `/productions/${productionId}/assets/${asset.id}/continuity/${f.continuityEventId}/files/${f.id}/url`
                        );
                        return { id: f.id, url };
                    })
                ).then((results) => {
                    const map: Record<string, string> = {};
                    results.forEach((res) => {
                        if (res.status === 'fulfilled') map[res.value.id] = res.value.url;
                    });
                    setContinuityFileUrls(map);
                });
            }
        }
    }, [asset.files, asset.continuityEvents, productionId, asset.id, token]);

    const handleUpdateStatus = async (newStatus: string) => {
        try {
            setAsset({ ...asset, status: newStatus });
            await client.patch(`/productions/${productionId}/assets/${asset.id}`, { status: newStatus });
            router.refresh();
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateNotes = async () => {
        try {
            setAsset({ ...asset, notes: notesTemp });
            await client.patch(`/productions/${productionId}/assets/${asset.id}`, { notes: notesTemp });
            setEditingNotes(false);
            router.refresh();
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateFinancials = async () => {
        try {
            const patch: any = {};
            if (financialsTemp.budgetCost !== '') patch.budgetCost = parseFloat(String(financialsTemp.budgetCost));
            else patch.budgetCost = null;
            if (financialsTemp.actualCost !== '') patch.actualCost = parseFloat(String(financialsTemp.actualCost));
            else patch.actualCost = null;
            patch.sourceVendor = financialsTemp.sourceVendor || null;
            setAsset({ ...asset, ...patch });
            await client.patch(`/productions/${productionId}/assets/${asset.id}`, patch);
            setEditingFinancials(false);
            router.refresh();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this asset?')) return;
        setIsDeleting(true);
        try {
            await client.delete(`/productions/${productionId}/assets/${asset.id}`);
            router.push(`/productions/${productionId}/assets`);
        } catch (e) {
            console.error(e);
            setIsDeleting(false);
        }
    };

    const addTag = async () => {
        if (!addingTag) return;
        try {
            await client.post(`/productions/${productionId}/assets/${asset.id}/tags`, { tagId: addingTag });
            const tagObj = allTags.find((t: any) => t.id === addingTag);
            setAsset({ ...asset, tags: [...asset.tags, tagObj] });
            setAddingTag('');
            router.refresh();
        } catch (e) {
            console.error(e);
        }
    };

    const removeTag = async (tagId: string) => {
        try {
            await client.delete(`/productions/${productionId}/assets/${asset.id}/tags/${tagId}`);
            setAsset({ ...asset, tags: asset.tags.filter((t: any) => t.id !== tagId) });
            router.refresh();
        } catch (e) {
            console.error(e);
        }
    };

    const addSet = async () => {
        if (!addingSet) return;
        try {
            await client.post(`/productions/${productionId}/assets/${asset.id}/sets`, { setId: addingSet });
            const setObj = allSets.find((s: any) => s.id === addingSet);
            setAsset({ ...asset, sets: [...asset.sets, setObj] });
            setAddingSet('');
            router.refresh();
        } catch (e) {
            console.error(e);
        }
    };

    const removeSet = async (setId: string) => {
        try {
            await client.delete(`/productions/${productionId}/assets/${asset.id}/sets/${setId}`);
            setAsset({ ...asset, sets: asset.sets.filter((s: any) => s.id !== setId) });
            router.refresh();
        } catch (e) {
            console.error(e);
        }
    };

    // Upload handler
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const apiUrl = '/api/proxy';
            const res = await fetch(`${apiUrl}/productions/${productionId}/assets/${asset.id}/files`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) throw new Error('Upload failed');
            const newFile = await res.json();
            setAsset({ ...asset, files: [newFile, ...(asset.files || [])] });
            router.refresh();
        } catch (err) {
            console.error(err);
            alert('Upload failed. Must be under 25MB and jpeg/png/webp/pdf.');
        }
    };

    const deleteFile = async (fileId: string) => {
        if (!window.confirm('Delete file?')) return;
        try {
            await client.delete(`/productions/${productionId}/assets/${asset.id}/files/${fileId}`);
            setAsset({ ...asset, files: asset.files.filter((f: any) => f.id !== fileId) });
            router.refresh();
        } catch (e) {
            console.error(e);
        }
    };

    // Setup continuity modal stub
    const [showContinuityModal, setShowContinuityModal] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [contForm, setContForm] = useState({ sceneNumber: '', state: 'PRESENT', notes: '' });
    const [contFile, setContFile] = useState<File | null>(null);

    const saveContinuityEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let ev;
            if (editingEventId) {
                // Update the existing record
                ev = await client.patch(`/productions/${productionId}/assets/${asset.id}/continuity/${editingEventId}`, contForm) as any;
            } else {
                // Create a new record
                ev = await client.post(`/productions/${productionId}/assets/${asset.id}/continuity`, contForm) as any;
            }

            // Upload file if selected
            if (contFile) {
                const formData = new FormData();
                formData.append('file', contFile);
                const apiUrl = '/api/proxy';
                const fileRes = await fetch(`${apiUrl}/productions/${productionId}/assets/${asset.id}/continuity/${ev.id}/files`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });
                if (fileRes.ok) {
                    const newFile = await fileRes.json();
                    ev.files = [newFile];
                }
            } else {
                ev.files = [];
            }

            if (editingEventId) {
                // Remove the old event and push the new one to reflect changes locally
                const updatedEvents = asset.continuityEvents.filter((item: any) => item.id !== editingEventId);
                // Keep the old files if no new file is uploaded
                const oldEvent = asset.continuityEvents.find((item: any) => item.id === editingEventId);
                if (!contFile && oldEvent && oldEvent.files) {
                    ev.files = oldEvent.files;
                }
                setAsset({ ...asset, continuityEvents: [...updatedEvents, ev] });
            } else {
                setAsset({ ...asset, continuityEvents: [...(asset.continuityEvents || []), ev] });
            }

            setShowContinuityModal(false);
            setEditingEventId(null);
            setContForm({ sceneNumber: '', state: 'PRESENT', notes: '' });
            setContFile(null);
            router.refresh();
        } catch (err) {
            console.error('Error adding continuity event:', err);
        }
    };

    const deleteContinuityFile = async (eventId: string, fileId: string) => {
        if (!window.confirm('Delete continuity photo?')) return;
        try {
            await client.delete(`/productions/${productionId}/assets/${asset.id}/continuity/${eventId}/files/${fileId}`);

            // Update local state
            const updatedEvents = asset.continuityEvents.map((ev: any) => {
                if (ev.id === eventId) {
                    return { ...ev, files: ev.files.filter((f: any) => f.id !== fileId) };
                }
                return ev;
            });
            setAsset({ ...asset, continuityEvents: updatedEvents });
            router.refresh();
        } catch (e) {
            console.error(e);
        }
    };

    const unassignedTags = allTags.filter((t: any) => !asset.tags.some((at: any) => at.id === t.id));
    const unassignedSets = allSets.filter((s: any) => !asset.sets.some((as: any) => as.id === s.id));

    return (
        <div className="flex flex-col gap-8 p-6 max-w-5xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-neutral-800 pb-6">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ASSET_CATEGORY_LABELS[asset.category]?.color || 'bg-neutral-800 text-neutral-400'}`}>
                                {ASSET_CATEGORY_LABELS[asset.category]?.label || asset.category}
                            </span>
                            <select
                                value={asset.status}
                                onChange={(e) => canEdit ? handleUpdateStatus(e.target.value) : null}
                                disabled={!canEdit}
                                className={`appearance-none outline-none cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-semibold pr-4 font-sans ${ASSET_STATUS_LABELS[asset.status]?.color || 'text-neutral-400'}`}
                            >
                                {Object.entries(ASSET_STATUS_LABELS).map(([key, val]) => (
                                    <option key={key} value={key} className="bg-neutral-900 text-white">{val.label}</option>
                                ))}
                            </select>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{asset.name}</h1>
                        <div className="flex flex-wrap text-sm text-neutral-400 gap-x-6 gap-y-2">
                            {asset.quantity > 1 && <span>Quantity: {asset.quantity}</span>}
                            {asset.dimensions && <span>Dimensions: {asset.dimensions}</span>}
                        </div>
                        {asset.description && (
                            <p className="mt-4 text-neutral-300 max-w-3xl leading-relaxed">{asset.description}</p>
                        )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                        {isAdOrPd && (
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex items-center justify-center p-2 rounded-md hover:bg-red-900/50 text-neutral-500 hover:text-red-400 transition-colors"
                                title="Delete Asset"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Content (Left Column) */}
                <div className="lg:col-span-2 flex flex-col gap-8">

                    {/* Notes Section */}
                    <section className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Notes</h2>
                            {canEdit && !editingNotes && (
                                <button onClick={() => setEditingNotes(true)} className="text-sm text-brand-primary hover:text-brand-primary/80">Edit</button>
                            )}
                        </div>
                        {editingNotes ? (
                            <div className="flex flex-col gap-3">
                                <textarea
                                    value={notesTemp}
                                    onChange={e => setNotesTemp(e.target.value)}
                                    className="min-h-[100px] w-full rounded-md border border-neutral-700 bg-neutral-800 p-3 text-sm text-white focus:border-brand-primary focus:outline-none"
                                />
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingNotes(false)} className="text-xs text-neutral-400 hover:text-white px-2 py-1">Cancel</button>
                                    <button onClick={handleUpdateNotes} className="text-xs bg-brand-primary text-white rounded px-3 py-1 font-medium hover:bg-brand-primary/90">Save</button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-300 whitespace-pre-wrap">{asset.notes || <span className="text-neutral-500 italic">No notes added.</span>}</p>
                        )}
                    </section>

                    {/* Photos Region */}
                    <section className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Photos & Files</h2>
                            {canEdit && (
                                <label className="flex items-center gap-2 cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">
                                    <Upload className="w-4 h-4" />
                                    Upload
                                    <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleUpload} />
                                </label>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {asset.files?.length === 0 ? (
                                <p className="text-sm text-neutral-500 col-span-full">No files uploaded.</p>
                            ) : (
                                asset.files?.map((f: any) => (
                                    <div key={f.id} className="relative group aspect-square bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden flex flex-col">
                                        <div className="flex-1 flex items-center justify-center p-4 bg-neutral-950">
                                            {f.mimeType.includes('image') ? (
                                                <Camera className="w-8 h-8 text-neutral-700" />
                                            ) : (
                                                <div className="text-xs font-mono text-neutral-500">PDF</div>
                                            )}
                                        </div>
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-2 transition-opacity">
                                            <p className="text-[10px] text-white truncate mb-2">{f.filename}</p>
                                            <div className="flex justify-between items-center">
                                                <a
                                                    href={fileUrls[f.id] || '#'}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs bg-white text-black px-2 py-1 rounded font-medium hover:bg-neutral-200"
                                                    onClick={(e) => {
                                                        if (!fileUrls[f.id]) e.preventDefault();
                                                    }}
                                                >
                                                    View
                                                </a>
                                                {isAdOrPd && (
                                                    <button onClick={() => deleteFile(f.id)} className="text-red-400 hover:text-red-300 bg-red-950/50 p-1 rounded">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Sidebar (Right Column) */}
                <div className="flex flex-col gap-6">

                    {/* Tags */}
                    <section className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 flex flex-col gap-4">
                        <h3 className="text-sm font-medium text-white uppercase tracking-wider">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                            {asset.tags?.map((t: any) => (
                                <div key={t.id} className="group flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300">
                                    <span>{t.name}</span>
                                    {isAdOrPd && (
                                        <button onClick={() => removeTag(t.id)} className="text-neutral-500 hover:text-red-400 ml-1">
                                            &times;
                                        </button>
                                    )}
                                </div>
                            ))}
                            {asset.tags?.length === 0 && <span className="text-xs text-neutral-500">No tags.</span>}
                        </div>
                        {canEdit && unassignedTags.length > 0 && (
                            <div className="flex gap-2 mt-2">
                                <select
                                    value={addingTag}
                                    onChange={e => setAddingTag(e.target.value)}
                                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded text-xs px-2 py-1.5 text-white"
                                >
                                    <option value="">Add Tag...</option>
                                    {unassignedTags.map((t: any) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <button onClick={addTag} disabled={!addingTag} className="bg-neutral-800 hover:bg-neutral-700 text-white rounded px-2 disabled:opacity-50">
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Sets */}
                    <section className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 flex flex-col gap-4">
                        <h3 className="text-sm font-medium text-white uppercase tracking-wider">Set Assignments</h3>
                        <div className="flex flex-col gap-2">
                            {asset.sets?.map((s: any) => (
                                <div key={s.id} className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-750">
                                    <Link href={`/productions/${productionId}/sets/${s.id}`} className="hover:text-white flex items-center gap-2">
                                        <LinkIcon className="w-3 h-3 text-neutral-500" />
                                        {s.name}
                                    </Link>
                                    {isAdOrPd && (
                                        <button onClick={() => removeSet(s.id)} className="text-neutral-500 hover:text-red-400">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {asset.sets?.length === 0 && <span className="text-xs text-neutral-500">Not assigned to any set.</span>}
                        </div>
                        {canEdit && unassignedSets.length > 0 && (
                            <div className="flex gap-2 mt-2">
                                <select
                                    value={addingSet}
                                    onChange={e => setAddingSet(e.target.value)}
                                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded text-xs px-2 py-1.5 text-white"
                                >
                                    <option value="">Assign Set...</option>
                                    {unassignedSets.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <button onClick={addSet} disabled={!addingSet} className="bg-neutral-800 hover:bg-neutral-700 text-white rounded px-2 disabled:opacity-50">
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Budget */}
                    {canSeeBudget && (
                        <section className="bg-emerald-950/20 rounded-xl border border-emerald-900/50 p-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                                    Financials
                                    {variance !== null && variance > 0 && <AlertTriangle className="w-4 h-4 text-orange-400" />}
                                </h3>
                                {canEdit && !editingFinancials && (
                                    <button
                                        onClick={() => {
                                            setFinancialsTemp({
                                                budgetCost: asset.budgetCost ?? '',
                                                actualCost: asset.actualCost ?? '',
                                                sourceVendor: asset.sourceVendor ?? '',
                                            });
                                            setEditingFinancials(true);
                                        }}
                                        className="text-xs text-emerald-500 hover:text-emerald-300"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>

                            {editingFinancials ? (
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-neutral-400">Budget Cost</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            value={financialsTemp.budgetCost}
                                            onChange={e => setFinancialsTemp({ ...financialsTemp, budgetCost: e.target.value })}
                                            className="rounded-md border border-emerald-800/50 bg-neutral-900 px-3 py-1.5 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-neutral-400">Actual Cost</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            value={financialsTemp.actualCost}
                                            onChange={e => setFinancialsTemp({ ...financialsTemp, actualCost: e.target.value })}
                                            className="rounded-md border border-emerald-800/50 bg-neutral-900 px-3 py-1.5 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-neutral-400">Source / Vendor</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. IKEA, Prop House LA"
                                            value={financialsTemp.sourceVendor}
                                            onChange={e => setFinancialsTemp({ ...financialsTemp, sourceVendor: e.target.value })}
                                            className="rounded-md border border-emerald-800/50 bg-neutral-900 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 mt-1">
                                        <button
                                            onClick={() => setEditingFinancials(false)}
                                            className="text-xs text-neutral-400 hover:text-white px-2 py-1"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleUpdateFinancials}
                                            className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white rounded px-3 py-1 font-medium"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-neutral-400">Budget</span>
                                        <span className="text-white font-mono">
                                            {asset.budgetCost != null ? `$${parseFloat(asset.budgetCost).toFixed(2)}` : <span className="text-neutral-600">—</span>}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-400">Actual</span>
                                        <span className="text-white font-mono">
                                            {asset.actualCost != null ? `$${parseFloat(asset.actualCost).toFixed(2)}` : <span className="text-neutral-600">—</span>}
                                        </span>
                                    </div>
                                    {variance !== null && (
                                        <div className={`flex justify-between border-t border-emerald-900/30 pt-2 font-medium ${variance > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                            <span>Variance</span>
                                            <span className="font-mono">{variance > 0 ? '+' : ''}${variance.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {asset.sourceVendor && (
                                        <div className="flex justify-between border-t border-emerald-900/30 pt-2">
                                            <span className="text-neutral-400">Vendor</span>
                                            <span className="text-neutral-300 text-xs text-right max-w-[130px] truncate" title={asset.sourceVendor}>
                                                {asset.sourceVendor}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Continuity */}
                    <section className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-white uppercase tracking-wider">Continuity Timeline</h3>
                            {canEdit && (
                                <button onClick={() => {
                                    setEditingEventId(null);
                                    setContForm({ sceneNumber: '', state: 'PRESENT', notes: '' });
                                    setContFile(null);
                                    setShowContinuityModal(true);
                                }} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded px-3 py-1.5 flex items-center gap-1 transition-colors">
                                    <Plus className="w-3 h-3" /> Add Event
                                </button>
                            )}
                        </div>

                        <div className="mt-2 relative">
                            {asset.continuityEvents?.length === 0 ? (
                                <p className="text-sm text-neutral-500 italic pb-2">No continuity events logged for this asset.</p>
                            ) : (
                                <div className="space-y-6 before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-800 before:to-transparent">
                                    {asset.continuityEvents?.map((ev: any, index: number) => {
                                        // Colors mapped to state
                                        const stateColors: Record<string, string> = {
                                            PRESENT: 'text-emerald-400 bg-emerald-950/40 border-emerald-900',
                                            ABSENT: 'text-neutral-500 bg-neutral-900 border-neutral-800',
                                            MODIFIED: 'text-amber-400 bg-amber-950/40 border-amber-900',
                                            HERO: 'text-violet-400 bg-violet-950/40 border-violet-900',
                                            DAMAGED: 'text-red-400 bg-red-950/40 border-red-900',
                                            DRESSED: 'text-blue-400 bg-blue-950/40 border-blue-900',
                                            STRUCK: 'text-orange-400 bg-orange-950/40 border-orange-900'
                                        };
                                        const colorClass = stateColors[ev.state] || 'text-white bg-neutral-800 border-neutral-700';
                                        const isEven = index % 2 === 0;

                                        return (
                                            <div key={ev.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                {/* Timeline dot */}
                                                <div
                                                    onClick={() => {
                                                        if (!canEdit) return;
                                                        setEditingEventId(ev.id);
                                                        setContForm({ sceneNumber: ev.sceneNumber, state: ev.state, notes: ev.notes || '' });
                                                        setContFile(null);
                                                        setShowContinuityModal(true);
                                                    }}
                                                    className={`flex items-center justify-center w-11 h-11 rounded-full border-4 border-neutral-900 bg-neutral-800 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${canEdit ? 'cursor-pointer hover:bg-neutral-700 hover:text-white text-neutral-300 transition-colors' : 'text-neutral-400'}`}
                                                    title={canEdit ? "Edit Event" : undefined}
                                                >
                                                    <span className="text-xs font-bold leading-none text-center">Sc<br />{ev.sceneNumber}</span>
                                                </div>

                                                {/* Event Card */}
                                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-xl border border-neutral-800 bg-neutral-950/50 shadow-sm flex flex-col gap-3">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>
                                                                {ev.state}
                                                            </span>
                                                            {isAdOrPd && (
                                                                <button onClick={() => deleteContinuityFile(ev.id, ev.files?.[0]?.id)} className="text-neutral-600 hover:text-red-400">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        {ev.notes && <p className="text-sm text-neutral-300 mt-2">{ev.notes}</p>}
                                                    </div>

                                                    {/* Photos in Timeline */}
                                                    {ev.files?.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {ev.files.map((f: any) => (
                                                                <div key={f.id} className="relative group/file w-full aspect-video md:aspect-square bg-neutral-900 rounded-md border border-neutral-800 overflow-hidden">
                                                                    {continuityFileUrls[f.id] ? (
                                                                        <a href={continuityFileUrls[f.id]} target="_blank" rel="noreferrer" className="block w-full h-full">
                                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                            <img src={continuityFileUrls[f.id]} alt="Continuity reference" className="w-full h-full object-cover" />
                                                                        </a>
                                                                    ) : (
                                                                        <div className="absolute inset-0 flex items-center justify-center p-4">
                                                                            <Camera className="w-6 h-6 text-neutral-700" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {showContinuityModal && (
                            <div className="mt-4 p-5 border border-brand-primary/30 bg-neutral-950 rounded-xl flex flex-col gap-4 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-semibold text-white">
                                        {editingEventId ? 'Edit Continuity Event' : 'Log Continuity State Change'}
                                    </h4>
                                </div>
                                <form onSubmit={saveContinuityEvent} className="flex flex-col gap-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs text-neutral-400 font-medium">Scene Number</label>
                                            <input required placeholder="e.g. 12 or 4A" value={contForm.sceneNumber} onChange={e => setContForm({ ...contForm, sceneNumber: e.target.value })} className="text-sm bg-neutral-900 border border-neutral-800 focus:border-brand-primary rounded-md px-3 py-2 text-white outline-none" />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs text-neutral-400 font-medium">New State</label>
                                            <select value={contForm.state} onChange={e => setContForm({ ...contForm, state: e.target.value })} className="text-sm bg-neutral-900 border border-neutral-800 focus:border-brand-primary rounded-md px-3 py-2 text-white outline-none appearance-none">
                                                {['PRESENT', 'ABSENT', 'MODIFIED', 'HERO', 'DAMAGED', 'DRESSED', 'STRUCK'].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-neutral-400 font-medium">Reference Photo (Optional)</label>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,application/pdf"
                                            onChange={(e) => setContFile(e.target.files?.[0] || null)}
                                            className="text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-white hover:file:bg-neutral-700"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-neutral-400 font-medium">Notes</label>
                                        <textarea placeholder="Describe the state change..." value={contForm.notes} onChange={e => setContForm({ ...contForm, notes: e.target.value })} className="text-sm bg-neutral-900 border border-neutral-800 focus:border-brand-primary rounded-md px-3 py-2 text-white outline-none min-h-[80px]" />
                                    </div>

                                    <div className="flex justify-end gap-3 mt-2">
                                        <button type="button" onClick={() => { setShowContinuityModal(false); setEditingEventId(null); setContFile(null); }} className="text-sm font-medium text-neutral-400 hover:text-white px-4 py-2 rounded-md transition-colors">Cancel</button>
                                        <button type="submit" className="bg-brand-primary hover:bg-brand-primary/90 text-white rounded-md font-medium text-sm px-6 py-2 transition-colors">
                                            {editingEventId ? 'Save Changes' : 'Save Event'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </section>

                </div>
            </div>
        </div>
    );
}
