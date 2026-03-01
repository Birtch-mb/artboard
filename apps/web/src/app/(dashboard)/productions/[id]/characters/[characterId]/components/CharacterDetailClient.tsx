'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    User,
    ChevronLeft,
    Pencil,
    Check,
    X,
    Plus,
    Trash2,
    Film,
} from 'lucide-react';

const INT_EXT_LABELS: Record<string, string> = {
    INT: 'INT',
    EXT: 'EXT',
    INT_EXT: 'INT/EXT',
};

const TIME_OF_DAY_LABELS: Record<string, string> = {
    DAY: 'Day',
    NIGHT: 'Night',
    DAWN: 'Dawn',
    DUSK: 'Dusk',
    CONTINUOUS: 'Continuous',
    LATER: 'Later',
    MOMENTS_LATER: 'Moments Later',
};

const ASSET_CATEGORY_LABELS: Record<string, string> = {
    PROPS: 'Props',
    SET_DRESSING: 'Set Dressing',
    GRAPHICS: 'Graphics',
    FURNITURE: 'Furniture',
    VEHICLES: 'Vehicles',
    EXPENDABLES: 'Expendables',
    SOFT_FURNISHINGS: 'Soft Furnishings',
    GREENS: 'Greens',
    WEAPONS: 'Weapons',
    FOOD: 'Food',
    ANIMALS: 'Animals',
    SPECIAL_EFFECTS: 'Special Effects',
    OTHER: 'Other',
};

export default function CharacterDetailClient({
    character: initialCharacter,
    allAssets,
    allSets,
    productionId,
    isAdOrPd,
    token,
}: {
    character: any;
    allAssets: any[];
    allSets: any[];
    productionId: string;
    isAdOrPd: boolean;
    token: string;
}) {
    const router = useRouter();
    const apiUrl = '/api/proxy';

    const [character, setCharacter] = useState(initialCharacter);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: character.name,
        height: character.height ?? '',
        notes: character.notes ?? '',
    });
    const [editError, setEditError] = useState('');
    const [saving, setSaving] = useState(false);

    const [showAssignAsset, setShowAssignAsset] = useState(false);
    const [assignForm, setAssignForm] = useState({ assetId: '', setId: '', notes: '' });
    const [assignError, setAssignError] = useState('');
    const [assigning, setAssigning] = useState(false);

    const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

    // Character-level delete
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDeleteCharacter = async () => {
        setDeleting(true);
        try {
            const res = await fetch(
                `${apiUrl}/productions/${productionId}/characters/${character.id}`,
                { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
            );
            if (!res.ok) return;
            router.push(`/productions/${productionId}/characters`);
            router.refresh();
        } finally {
            setDeleting(false);
        }
    };

    // Assigned asset IDs for filtering the dropdown
    const assignedAssetIds = new Set(character.assets.map((a: any) => a.assetId));
    const unassignedAssets = allAssets.filter((a) => !assignedAssetIds.has(a.id));

    const saveEdit = async () => {
        if (!editForm.name.trim()) return;
        setSaving(true);
        setEditError('');

        try {
            const res = await fetch(
                `${apiUrl}/productions/${productionId}/characters/${character.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        name: editForm.name.trim(),
                        height: editForm.height || null,
                        notes: editForm.notes || null,
                    }),
                }
            );

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setEditError(err.message || 'Failed to save');
                return;
            }

            const updated = await res.json();
            setCharacter((prev: any) => ({ ...prev, ...updated }));
            setEditing(false);
        } catch {
            setEditError('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleAssignAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignForm.assetId) return;
        setAssigning(true);
        setAssignError('');

        try {
            const res = await fetch(
                `${apiUrl}/productions/${productionId}/characters/${character.id}/assets`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        assetId: assignForm.assetId,
                        setId: assignForm.setId || undefined,
                        notes: assignForm.notes || undefined,
                    }),
                }
            );

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setAssignError(err.message || 'Failed to assign asset');
                return;
            }

            const created = await res.json();
            setCharacter((prev: any) => ({
                ...prev,
                assets: [
                    ...prev.assets,
                    {
                        id: created.id,
                        assetId: created.assetId,
                        assetName: created.asset.name,
                        assetCategory: created.asset.category,
                        assetStatus: created.asset.status,
                        setId: created.setId,
                        setName: created.set?.name ?? null,
                        notes: created.notes,
                        createdAt: created.createdAt,
                    },
                ],
            }));
            setAssignForm({ assetId: '', setId: '', notes: '' });
            setShowAssignAsset(false);
        } catch {
            setAssignError('Failed to assign asset');
        } finally {
            setAssigning(false);
        }
    };

    const handleRemoveAsset = async (assetId: string) => {
        setDeletingAssetId(assetId);
        try {
            const res = await fetch(
                `${apiUrl}/productions/${productionId}/characters/${character.id}/assets/${assetId}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (!res.ok) return;
            setCharacter((prev: any) => ({
                ...prev,
                assets: prev.assets.filter((a: any) => a.assetId !== assetId),
            }));
        } finally {
            setDeletingAssetId(null);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
            {/* Back link */}
            <Link
                href={`/productions/${productionId}/characters`}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors w-fit"
            >
                <ChevronLeft className="w-3 h-3" />
                All Characters
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                        <User className="w-7 h-7 text-neutral-400" />
                    </div>
                    {editing ? (
                        <div className="flex flex-col gap-2">
                            <input
                                value={editForm.name}
                                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-xl font-bold text-white focus:outline-none focus:border-brand-primary"
                                placeholder="Character name"
                            />
                            <input
                                value={editForm.height}
                                onChange={(e) => setEditForm((f) => ({ ...f, height: e.target.value }))}
                                className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-sm text-neutral-300 focus:outline-none focus:border-brand-primary"
                                placeholder="Height (e.g. 5ft 10in)"
                            />
                            {editError && <p className="text-xs text-red-400">{editError}</p>}
                        </div>
                    ) : (
                        <div>
                            <h1 className="text-2xl font-bold text-white">{character.name}</h1>
                            {character.height && (
                                <p className="text-sm text-neutral-400 mt-0.5">{character.height}</p>
                            )}
                        </div>
                    )}
                </div>

                {isAdOrPd && (
                    <div className="flex items-center gap-2 shrink-0">
                        {editing ? (
                            <>
                                <button
                                    onClick={saveEdit}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary rounded-md text-xs font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
                                >
                                    <Check className="w-3 h-3" />
                                    Save
                                </button>
                                <button
                                    onClick={() => { setEditing(false); setEditError(''); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 rounded-md text-xs text-neutral-300 hover:bg-neutral-600"
                                >
                                    <X className="w-3 h-3" />
                                    Cancel
                                </button>
                            </>
                        ) : confirmDelete ? (
                            <>
                                <span className="text-xs text-neutral-400">Delete this character?</span>
                                <button
                                    onClick={handleDeleteCharacter}
                                    disabled={deleting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700 rounded-md text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                                >
                                    {deleting ? 'Deleting…' : 'Yes, delete'}
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 rounded-md text-xs text-neutral-300 hover:bg-neutral-600"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => {
                                        setEditForm({ name: character.name, height: character.height ?? '', notes: character.notes ?? '' });
                                        setEditing(true);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 rounded-md text-xs text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                                >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 rounded-md text-xs text-neutral-500 hover:bg-red-900/40 hover:text-red-400 transition-colors"
                                    title="Delete character"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Notes */}
            <section className="bg-neutral-900 rounded-xl border border-neutral-800 p-5">
                <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Notes</h3>
                {editing ? (
                    <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                        rows={4}
                        placeholder="Breakdown notes, context…"
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-primary resize-none"
                    />
                ) : (
                    <p className="text-sm text-neutral-300 whitespace-pre-wrap">
                        {character.notes || <span className="text-neutral-600 italic">No notes.</span>}
                    </p>
                )}
            </section>

            {/* Assets */}
            <section className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                        Assets
                        <span className="ml-2 text-neutral-600 normal-case font-normal">
                            ({character.assets.length})
                        </span>
                    </h3>
                    {isAdOrPd && (
                        <button
                            onClick={() => setShowAssignAsset((v) => !v)}
                            className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary/80 transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                            Assign asset
                        </button>
                    )}
                </div>

                {/* Assign asset form */}
                {showAssignAsset && (
                    <form
                        onSubmit={handleAssignAsset}
                        className="flex flex-col gap-2 p-3 border border-brand-primary/30 bg-brand-primary/5 rounded-lg"
                    >
                        <select
                            required
                            value={assignForm.assetId}
                            onChange={(e) => setAssignForm((f) => ({ ...f, assetId: e.target.value }))}
                            className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
                        >
                            <option value="">Select asset…</option>
                            {unassignedAssets.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name} ({ASSET_CATEGORY_LABELS[a.category] ?? a.category})
                                </option>
                            ))}
                        </select>
                        <select
                            value={assignForm.setId}
                            onChange={(e) => setAssignForm((f) => ({ ...f, setId: e.target.value }))}
                            className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
                        >
                            <option value="">All sets (follows character everywhere)</option>
                            {allSets.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Notes (optional)"
                            value={assignForm.notes}
                            onChange={(e) => setAssignForm((f) => ({ ...f, notes: e.target.value }))}
                            className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-primary"
                        />
                        {assignError && <p className="text-xs text-red-400">{assignError}</p>}
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={assigning}
                                className="px-3 py-1.5 bg-brand-primary rounded text-xs font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
                            >
                                {assigning ? 'Assigning…' : 'Assign'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowAssignAsset(false); setAssignForm({ assetId: '', setId: '', notes: '' }); setAssignError(''); }}
                                className="px-3 py-1.5 bg-neutral-700 rounded text-xs text-neutral-300 hover:bg-neutral-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {character.assets.length === 0 ? (
                    <p className="text-xs text-neutral-600 italic">No assets assigned to this character.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {character.assets.map((ca: any) => (
                            <div
                                key={ca.id}
                                className="flex items-center justify-between bg-neutral-950 rounded-lg border border-neutral-800 px-3 py-2.5"
                            >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/productions/${productionId}/assets/${ca.assetId}`}
                                            className="text-sm font-medium text-white hover:text-brand-primary transition-colors truncate"
                                        >
                                            {ca.assetName}
                                        </Link>
                                        <span className="text-xs text-neutral-500 shrink-0">
                                            {ASSET_CATEGORY_LABELS[ca.assetCategory] ?? ca.assetCategory}
                                        </span>
                                    </div>
                                    {ca.setName ? (
                                        <span className="text-xs text-neutral-500">
                                            Scoped to: {ca.setName}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-neutral-600">All sets</span>
                                    )}
                                    {ca.notes && (
                                        <span className="text-xs text-neutral-500 italic">{ca.notes}</span>
                                    )}
                                </div>
                                {isAdOrPd && (
                                    <button
                                        onClick={() => handleRemoveAsset(ca.assetId)}
                                        disabled={deletingAssetId === ca.assetId}
                                        className="ml-3 p-1.5 text-neutral-600 hover:text-red-400 transition-colors disabled:opacity-40 shrink-0"
                                        title="Remove asset"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Scenes */}
            <section className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 flex flex-col gap-4">
                <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Scenes
                    <span className="ml-2 text-neutral-600 normal-case font-normal">
                        ({character.scenes.length})
                    </span>
                </h3>

                {character.scenes.length === 0 ? (
                    <p className="text-xs text-neutral-600 italic">
                        No scenes assigned yet. Assign this character to scenes in the breakdown.
                    </p>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {character.scenes.map((scene: any) => (
                            <Link
                                key={scene.id}
                                href={`/productions/${productionId}/script/${scene.script?.id}`}
                                className="flex items-center gap-3 px-3 py-2 bg-neutral-950 rounded-lg border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 transition-colors group"
                            >
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Film className="w-3.5 h-3.5 text-neutral-600" />
                                    <span className="text-xs font-mono font-semibold text-white">
                                        Sc. {scene.sceneNumber}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-xs text-neutral-500 shrink-0">
                                        {INT_EXT_LABELS[scene.intExt] ?? scene.intExt}
                                    </span>
                                    <span className="text-xs text-neutral-300 truncate">
                                        {scene.scriptedLocationName}
                                    </span>
                                    <span className="text-xs text-neutral-600 shrink-0">
                                        {TIME_OF_DAY_LABELS[scene.timeOfDay] ?? scene.timeOfDay}
                                    </span>
                                </div>
                                {scene.synopsis && (
                                    <span className="text-xs text-neutral-500 truncate max-w-xs hidden md:block">
                                        {scene.synopsis}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
