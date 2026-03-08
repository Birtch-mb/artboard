'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import SceneDiffText from './SceneDiffText';
import {
    Plus,
    ChevronDown,
    ChevronRight,
    Check,
    MapPin,
    Box,
    Scissors,
    X,
    Search,
    Users,
    FileText,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SceneChild {
    id: string;
    sceneNumber: string;
}

interface SceneSet {
    id: string;
    name: string;
    locations?: { location: { id: string; name: string } }[];
}

interface Scene {
    id: string;
    sceneNumber: string;
    intExt: string;
    scriptedLocationName: string;
    timeOfDay: string;
    synopsis: string | null;
    notes: string | null;
    pageCount: string | null;
    changeFlag: string;
    changeReviewed: boolean;
    wizardStatus: string;
    parentSceneId: string | null;
    set: SceneSet | null;
    location: { id: string; name: string } | null;
    children: SceneChild[];
    _count: { assets: number; children: number; characters: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANGE_FLAG_STYLES: Record<string, { label: string; color: string }> = {
    MODIFIED: { label: 'Modified', color: 'bg-amber-900/50 text-amber-300 border-amber-800' },
    ADDED: { label: 'Added', color: 'bg-green-900/50 text-green-300 border-green-800' },
    OMITTED: { label: 'Omitted', color: 'bg-red-900/50 text-red-300 border-red-800' },
    RENUMBERED: { label: 'Renumbered', color: 'bg-blue-900/50 text-blue-300 border-blue-800' },
};

const INT_EXT_LABELS: Record<string, string> = {
    INT: 'INT',
    EXT: 'EXT',
    INT_EXT: 'INT/EXT',
};

const TIME_OF_DAY_OPTIONS = [
    { value: 'DAY', label: 'Day' },
    { value: 'NIGHT', label: 'Night' },
    { value: 'DAWN', label: 'Dawn' },
    { value: 'DUSK', label: 'Dusk' },
    { value: 'CONTINUOUS', label: 'Continuous' },
    { value: 'LATER', label: 'Later' },
    { value: 'MOMENTS_LATER', label: 'Moments Later' },
];

// ─── Scene sort ───────────────────────────────────────────────────────────────

function parseSceneNumber(num: string) {
    const match = num.match(/^(\d+)([A-Za-z]*)$/);
    if (!match) return { prefix: 0, suffix: num };
    return { prefix: parseInt(match[1], 10), suffix: match[2] };
}

function compareSceneNumbers(a: string, b: string): number {
    const pa = parseSceneNumber(a);
    const pb = parseSceneNumber(b);
    if (pa.prefix !== pb.prefix) return pa.prefix - pb.prefix;
    return pa.suffix.localeCompare(pb.suffix);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChangeFlagPill({ flag }: { flag: string }) {
    const style = CHANGE_FLAG_STYLES[flag];
    if (!style) return null;
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.color}`}>
            {style.label}
        </span>
    );
}

function IntExtBadge({ value }: { value: string }) {
    return (
        <span className="inline-flex items-center rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-300 tracking-wide">
            {INT_EXT_LABELS[value] ?? value}
        </span>
    );
}

// ─── Add Scene Panel ──────────────────────────────────────────────────────────

function AddScenePanel({
    scriptId,
    productionId,
    sets,
    token,
    existingNumbers,
    onCreated,
    onSetCreated,
    onClose,
}: {
    scriptId: string;
    productionId: string;
    sets: any[];
    token: string;
    existingNumbers: Set<string>;
    onCreated: (scene: Scene) => void;
    onSetCreated: (set: any) => void;
    onClose: () => void;
}) {
    const [showCreateSet, setShowCreateSet] = useState(false);
    const [form, setForm] = useState({
        sceneNumber: '',
        intExt: 'INT',
        scriptedLocationName: '',
        timeOfDay: 'DAY',
        synopsis: '',
        pageCount: '',
        setId: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isDuplicateNumber = form.sceneNumber.trim() !== '' && existingNumbers.has(form.sceneNumber.trim());

    const handleSubmit = async () => {
        if (!form.sceneNumber.trim() || !form.scriptedLocationName.trim()) {
            setError('Scene number and scripted location name are required.');
            return;
        }
        if (isDuplicateNumber) {
            setError('Scene number already exists in this script.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const apiUrl = '/api/proxy';
            const body: Record<string, any> = {
                sceneNumber: form.sceneNumber.trim(),
                intExt: form.intExt,
                scriptedLocationName: form.scriptedLocationName.trim(),
                timeOfDay: form.timeOfDay,
            };
            if (form.synopsis.trim()) body.synopsis = form.synopsis.trim();
            if (form.pageCount.trim()) body.pageCount = parseFloat(form.pageCount);
            if (form.setId) body.setId = form.setId;

            const res = await fetch(
                `${apiUrl}/productions/${productionId}/scripts/${scriptId}/scenes`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                },
            );

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Failed to create scene' }));
                throw new Error(err.message || 'Failed to create scene');
            }

            const scene = await res.json();
            onCreated(scene);
        } catch (e: any) {
            setError(e.message || 'Failed to create scene');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700';
    const labelCls = 'block text-xs font-medium text-neutral-400 mb-1';

    return (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-neutral-800 bg-neutral-950 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Add Scene</h2>
                <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                <div>
                    <label className={labelCls}>Scene Number <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        placeholder="e.g. 4, 4A, 12B"
                        maxLength={20}
                        value={form.sceneNumber}
                        onChange={(e) => setForm((f) => ({ ...f, sceneNumber: e.target.value }))}
                        className={`${inputCls} ${isDuplicateNumber ? 'border-amber-600' : ''}`}
                    />
                    {isDuplicateNumber && (
                        <p className="text-xs text-amber-400 mt-1">This scene number already exists in this script.</p>
                    )}
                </div>

                <div>
                    <label className={labelCls}>INT / EXT <span className="text-red-400">*</span></label>
                    <div className="flex gap-2">
                        {['INT', 'EXT', 'INT_EXT'].map((v) => (
                            <button
                                key={v}
                                onClick={() => setForm((f) => ({ ...f, intExt: v }))}
                                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${form.intExt === v
                                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                                    : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                                    }`}
                            >
                                {INT_EXT_LABELS[v]}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Scripted Location Name <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        placeholder="As written in the script"
                        maxLength={500}
                        value={form.scriptedLocationName}
                        onChange={(e) => setForm((f) => ({ ...f, scriptedLocationName: e.target.value }))}
                        className={inputCls}
                    />
                </div>

                <div>
                    <label className={labelCls}>Time of Day <span className="text-red-400">*</span></label>
                    <select
                        value={form.timeOfDay}
                        onChange={(e) => setForm((f) => ({ ...f, timeOfDay: e.target.value }))}
                        className={inputCls}
                    >
                        {TIME_OF_DAY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value} className="bg-neutral-900">
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={labelCls}>Synopsis</label>
                    <textarea
                        rows={3}
                        placeholder="Brief description of the scene"
                        value={form.synopsis}
                        onChange={(e) => setForm((f) => ({ ...f, synopsis: e.target.value }))}
                        className={`${inputCls} resize-none`}
                    />
                </div>

                <div>
                    <label className={labelCls}>Page Count</label>
                    <input
                        type="number"
                        step="0.125"
                        min="0"
                        max="99"
                        placeholder="e.g. 1.5"
                        value={form.pageCount}
                        onChange={(e) => setForm((f) => ({ ...f, pageCount: e.target.value }))}
                        className={inputCls}
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className={labelCls}>Set</label>
                        <button
                            type="button"
                            onClick={() => setShowCreateSet(true)}
                            className="flex items-center gap-0.5 text-xs text-brand-primary hover:text-brand-primary/80 transition-colors"
                        >
                            <Plus className="h-3 w-3" />
                            Add
                        </button>
                    </div>
                    <select
                        value={form.setId}
                        onChange={(e) => setForm((f) => ({ ...f, setId: e.target.value }))}
                        className={inputCls}
                    >
                        <option value="" className="bg-neutral-900">None (match later)</option>
                        {sets.map((s) => (
                            <option key={s.id} value={s.id} className="bg-neutral-900">
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <div className="border-t border-neutral-800 px-6 py-4 flex gap-3">
                <button
                    onClick={onClose}
                    className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={saving || isDuplicateNumber}
                    className="flex-1 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? 'Adding…' : 'Add Scene'}
                </button>
            </div>

            {showCreateSet && (
                <CreateSetModal
                    productionId={productionId}
                    token={token}
                    onCreated={(newSet) => {
                        onSetCreated(newSet);
                        setForm((f) => ({ ...f, setId: newSet.id }));
                    }}
                    onClose={() => setShowCreateSet(false)}
                />
            )}
        </div>
    );
}

// ─── Split Modal ──────────────────────────────────────────────────────────────

function SplitSceneModal({
    scene,
    productionId,
    token,
    existingNumbers,
    onSplit,
    onClose,
}: {
    scene: Scene;
    productionId: string;
    token: string;
    existingNumbers: Set<string>;
    onSplit: (result: { parent: Scene; children: Scene[] }) => void;
    onClose: () => void;
}) {
    const [subNums, setSubNums] = useState(['', '']);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSplit = async () => {
        const trimmed = subNums.map((s) => s.trim()).filter(Boolean);
        if (trimmed.length < 2) {
            setError('At least 2 sub-scene numbers are required.');
            return;
        }
        const duplicates = trimmed.filter((n) => existingNumbers.has(n));
        if (duplicates.length > 0) {
            setError(`These numbers already exist: ${duplicates.join(', ')}`);
            return;
        }
        const unique = new Set(trimmed);
        if (unique.size !== trimmed.length) {
            setError('Sub-scene numbers must be unique.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const apiUrl = '/api/proxy';
            const res = await fetch(
                `${apiUrl}/productions/${productionId}/scenes/${scene.id}/split`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ subScenes: trimmed.map((sn) => ({ sceneNumber: sn })) }),
                },
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Split failed' }));
                throw new Error(err.message || 'Split failed');
            }
            const result = await res.json();
            onSplit(result);
        } catch (e: any) {
            setError(e.message || 'Split failed');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
                <h2 className="text-lg font-semibold text-white mb-1">Split Scene {scene.sceneNumber}</h2>
                <p className="text-sm text-neutral-500 mb-4">
                    Define sub-scene numbers. Each will inherit the parent&apos;s location and assets.
                </p>

                <div className="flex flex-col gap-2">
                    {subNums.map((val, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input
                                type="text"
                                placeholder={`Sub-scene number (e.g. ${scene.sceneNumber}A)`}
                                maxLength={20}
                                value={val}
                                onChange={(e) => {
                                    const next = [...subNums];
                                    next[idx] = e.target.value;
                                    setSubNums(next);
                                }}
                                className={inputCls}
                            />
                            {subNums.length > 2 && (
                                <button
                                    onClick={() => setSubNums((prev) => prev.filter((_, i) => i !== idx))}
                                    className="text-neutral-500 hover:text-red-400 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={() => setSubNums((prev) => [...prev, ''])}
                        className="text-sm text-brand-primary hover:text-brand-primary/80 transition-colors text-left"
                    >
                        + Add another
                    </button>
                </div>

                {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSplit}
                        disabled={saving}
                        className="flex-1 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Splitting…' : 'Split Scene'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Create Set Modal ─────────────────────────────────────────────────────────

function CreateSetModal({
    productionId,
    token,
    onCreated,
    onClose,
}: {
    productionId: string;
    token: string;
    onCreated: (set: any) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleCreate = async () => {
        if (!name.trim() || saving) return;
        setSaving(true);
        setError('');
        try {
            const apiUrl = '/api/proxy';
            const res = await fetch(`${apiUrl}/productions/${productionId}/sets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: name.trim(), status: 'IDEATION' }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Failed to create set' }));
                throw new Error(err.message || 'Failed to create set');
            }
            const newSet = await res.json();
            onCreated(newSet);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to create set');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-sm mx-4 rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-white">New Set</h2>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <input
                    type="text"
                    autoFocus
                    placeholder="Set name (e.g. Living Room, Stage 4)"
                    maxLength={200}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                    className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700 mb-3"
                />
                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={saving || !name.trim()}
                        className="flex-1 rounded-md bg-brand-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Creating…' : 'Create Set'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Expanded Scene Detail ────────────────────────────────────────────────────

function SceneDetail({
    scene,
    productionId,
    sets,
    assets,
    productionCharacters,
    canEdit,
    canReview,
    canAssignAsset,
    token,
    showDeletions,
    onUpdate,
    onSetCreated,
}: {
    scene: Scene;
    productionId: string;
    sets: any[];
    assets: any[];
    productionCharacters: any[];
    canEdit: boolean;
    canReview: boolean;
    canAssignAsset: boolean;
    token: string;
    showDeletions: boolean;
    onUpdate: (scene: Scene) => void;
    onSetCreated: (set: any) => void;
}) {
    const [fullScene, setFullScene] = useState<any>(null);
    const [showCreateSet, setShowCreateSet] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [assetSearch, setAssetSearch] = useState('');
    const [charSearch, setCharSearch] = useState('');
    const [assigning, setAssigning] = useState(false);

    const apiUrl = '/api/proxy';

    // Load full scene detail (with assets) on mount
    const loadDetail = async () => {
        if (fullScene || loadingDetail) return;
        setLoadingDetail(true);
        try {
            const res = await fetch(
                `${apiUrl}/productions/${productionId}/scenes/${scene.id}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (res.ok) setFullScene(await res.json());
        } finally {
            setLoadingDetail(false);
        }
    };

    // Call on first render
    if (!fullScene && !loadingDetail) loadDetail();

    const handleSetChange = async (newSetId: string) => {
        const body = newSetId ? { setId: newSetId } : { setId: null };
        const res = await fetch(
            `${apiUrl}/productions/${productionId}/scenes/${scene.id}/set`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            },
        );
        if (res.ok) {
            const updated = await res.json();
            onUpdate(updated);
        }
    };

    const handleAssignAsset = async (assetId: string) => {
        if (assigning) return;
        setAssigning(true);
        try {
            const res = await fetch(
                `${apiUrl}/productions/${productionId}/scenes/${scene.id}/assets`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ assetId }),
                },
            );
            if (res.ok) {
                // Reload full scene to get updated assets
                const detailRes = await fetch(
                    `${apiUrl}/productions/${productionId}/scenes/${scene.id}`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );
                if (detailRes.ok) {
                    const updated = await detailRes.json();
                    setFullScene(updated);
                    onUpdate(updated);
                }
                setAssetSearch('');
            }
        } finally {
            setAssigning(false);
        }
    };

    const handleRemoveAsset = async (assetId: string) => {
        const res = await fetch(
            `${apiUrl}/productions/${productionId}/scenes/${scene.id}/assets/${assetId}`,
            {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        if (res.ok) {
            const detailRes = await fetch(
                `${apiUrl}/productions/${productionId}/scenes/${scene.id}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (detailRes.ok) {
                const updated = await detailRes.json();
                setFullScene(updated);
                onUpdate(updated);
            }
        }
    };

    const handleAssignCharacter = async (characterId: string) => {
        const res = await fetch(
            `${apiUrl}/productions/${productionId}/scenes/${scene.id}/characters`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ characterId }),
            },
        );
        if (res.ok) {
            const detailRes = await fetch(
                `${apiUrl}/productions/${productionId}/scenes/${scene.id}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (detailRes.ok) setFullScene(await detailRes.json());
            setCharSearch('');
        }
    };

    const handleRemoveCharacter = async (characterId: string) => {
        const res = await fetch(
            `${apiUrl}/productions/${productionId}/scenes/${scene.id}/characters/${characterId}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
            const detailRes = await fetch(
                `${apiUrl}/productions/${productionId}/scenes/${scene.id}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (detailRes.ok) setFullScene(await detailRes.json());
        }
    };

    const handleMarkReviewed = async () => {
        const res = await fetch(
            `${apiUrl}/productions/${productionId}/scenes/${scene.id}/review`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ changeReviewed: true }),
            },
        );
        if (res.ok) {
            const updated = await res.json();
            onUpdate(updated);
        }
    };

    const sceneAssets: any[] = fullScene?.assets ?? [];
    const sceneChars: any[] = fullScene?.characters ?? [];
    const assignedAssetIds = new Set(sceneAssets.map((a: any) => a.id));
    const assignedCharIds = new Set(sceneChars.map((c: any) => c.id));
    const filteredAssets = assets
        .filter((a) => !assignedAssetIds.has(a.id))
        .filter((a) => a.name.toLowerCase().includes(assetSearch.toLowerCase()));
    const filteredChars = productionCharacters
        .filter((c) => !assignedCharIds.has(c.id))
        .filter((c) => c.name.toLowerCase().includes(charSearch.toLowerCase()));

    return (
        <div className="px-6 pb-5 pt-3 border-t border-neutral-800/50 bg-neutral-900/30 space-y-4">
            {/* Change flag review banner */}
            {scene.changeFlag !== 'NONE' && !scene.changeReviewed && (
                <div className="flex items-center justify-between rounded-lg border border-amber-800/60 bg-amber-900/20 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                        <ChangeFlagPill flag={scene.changeFlag} />
                        <span className="text-sm text-amber-200">This scene has been flagged as changed.</span>
                    </div>
                    {canReview && (
                        <button
                            onClick={handleMarkReviewed}
                            className="text-xs font-medium text-amber-300 border border-amber-700 rounded px-2.5 py-1 hover:bg-amber-800/30 transition-colors"
                        >
                            Mark Reviewed
                        </button>
                    )}
                </div>
            )}

            {/* Scene text from script (parsed from PDF) */}
            {fullScene?.sceneText && (
                <div>
                    <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">Scene Text</p>
                    <pre className="whitespace-pre-wrap font-courier-prime font-bold text-sm text-neutral-900 bg-white rounded-lg border border-neutral-300 px-6 py-4 max-h-64 overflow-y-auto leading-relaxed shadow-sm">
                        {(fullScene.changeFlag === 'NONE' || fullScene.changeFlag === 'OMITTED') ? (
                            fullScene.sceneText
                        ) : (
                            <SceneDiffText
                                newText={fullScene.sceneText}
                                previousText={fullScene.previousRawText ?? null}
                                showDeletions={showDeletions}
                            />
                        )}
                    </pre>
                </div>
            )}

            {/* Characters */}
            <div>
                <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                    <Users className="h-3 w-3" /> Characters
                </p>
                {loadingDetail ? (
                    <p className="text-xs text-neutral-600">Loading…</p>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {sceneChars.map((c: { id: string; name: string }) => (
                                <span
                                    key={c.id}
                                    className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-200"
                                >
                                    {c.name}
                                    {canEdit && (
                                        <button
                                            onClick={() => handleRemoveCharacter(c.id)}
                                            className="text-neutral-500 hover:text-red-400 transition-colors ml-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </span>
                            ))}
                            {sceneChars.length === 0 && (
                                <span className="text-xs text-neutral-600 italic">No characters assigned</span>
                            )}
                        </div>
                        {canEdit && (
                            <div className="relative max-w-sm">
                                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                                <input
                                    type="text"
                                    placeholder="Search characters to add…"
                                    value={charSearch}
                                    onChange={(e) => setCharSearch(e.target.value)}
                                    className="w-full rounded-md border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-3 text-xs text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none"
                                />
                                {charSearch.trim() !== '' && filteredChars.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border border-neutral-800 bg-neutral-900 shadow-lg max-h-40 overflow-y-auto">
                                        {filteredChars.slice(0, 15).map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => handleAssignCharacter(c.id)}
                                                className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {charSearch.trim() !== '' && filteredChars.length === 0 && (
                                    <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border border-neutral-800 bg-neutral-900 shadow-lg px-3 py-2 text-xs text-neutral-500">
                                        No matching characters
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Synopsis */}
            {scene.synopsis && (
                <div>
                    <p className="text-xs text-neutral-500 mb-1 uppercase tracking-wider">Synopsis</p>
                    <p className="text-sm text-neutral-300">{scene.synopsis}</p>
                </div>
            )}

            {/* Notes */}
            {scene.notes && (
                <div>
                    <p className="text-xs text-neutral-500 mb-1 uppercase tracking-wider">Notes</p>
                    <p className="text-sm text-neutral-300">{scene.notes}</p>
                </div>
            )}

            {/* Set assignment */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                        <Box className="h-3 w-3" /> Set
                    </p>
                    {canEdit && (
                        <button
                            onClick={() => setShowCreateSet(true)}
                            className="flex items-center gap-0.5 text-xs text-brand-primary hover:text-brand-primary/80 transition-colors"
                        >
                            <Plus className="h-3 w-3" />
                            Add
                        </button>
                    )}
                </div>
                {canEdit ? (
                    <div className="flex items-center gap-2">
                        <select
                            value={scene.set?.id ?? ''}
                            onChange={(e) => handleSetChange(e.target.value)}
                            className="flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 focus:border-neutral-700 focus:outline-none"
                        >
                            <option value="" className="bg-neutral-900">Unmatched</option>
                            {sets.map((s) => (
                                <option key={s.id} value={s.id} className="bg-neutral-900">
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        {scene.set && (
                            <button
                                onClick={() => handleSetChange('')}
                                className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-neutral-400">
                        {scene.set ? scene.set.name : <span className="italic text-neutral-600">Unmatched</span>}
                    </p>
                )}
                {showCreateSet && (
                    <CreateSetModal
                        productionId={productionId}
                        token={token}
                        onCreated={(newSet) => {
                            onSetCreated(newSet);
                            handleSetChange(newSet.id);
                        }}
                        onClose={() => setShowCreateSet(false)}
                    />
                )}
            </div>

            {/* Location — derived from the scene's set */}
            {scene.location && (
                <div>
                    <p className="text-xs text-neutral-500 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Location
                    </p>
                    <p className="text-sm text-neutral-400">{scene.location.name}</p>
                </div>
            )}

            {/* Assets */}
            <div>
                <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                    <Box className="h-3 w-3" /> Assets ({scene._count.assets})
                </p>

                {loadingDetail ? (
                    <p className="text-xs text-neutral-600">Loading assets…</p>
                ) : (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {sceneAssets.map((asset: any) => (
                            <span
                                key={asset.id}
                                className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300"
                            >
                                {asset.name}
                                {canEdit && (
                                    <button
                                        onClick={() => handleRemoveAsset(asset.id)}
                                        className="text-neutral-500 hover:text-red-400 transition-colors ml-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </span>
                        ))}
                        {sceneAssets.length === 0 && (
                            <span className="text-xs text-neutral-600 italic">No assets assigned</span>
                        )}
                    </div>
                )}

                {canAssignAsset && (
                    <div className="relative mt-1 max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search assets to add…"
                            value={assetSearch}
                            onChange={(e) => setAssetSearch(e.target.value)}
                            className="w-full rounded-md border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-3 text-xs text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none"
                        />
                        {assetSearch.trim() !== '' && filteredAssets.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border border-neutral-800 bg-neutral-900 shadow-lg max-h-40 overflow-y-auto">
                                {filteredAssets.slice(0, 20).map((asset) => (
                                    <button
                                        key={asset.id}
                                        onClick={() => handleAssignAsset(asset.id)}
                                        disabled={assigning}
                                        className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
                                    >
                                        {asset.name}
                                        <span className="text-neutral-600 ml-1">({asset.category})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {assetSearch.trim() !== '' && filteredAssets.length === 0 && (
                            <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border border-neutral-800 bg-neutral-900 shadow-lg px-3 py-2 text-xs text-neutral-500">
                                No assets found
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Scene Row ────────────────────────────────────────────────────────────────

function SceneRow({
    scene,
    isExpanded,
    onToggle,
    productionId,
    sets,
    assets,
    productionCharacters,
    canEdit,
    canReview,
    canAssignAsset,
    token,
    showDeletions,
    onUpdate,
    onSplit,
    onSetCreated,
    isSubScene,
}: {
    scene: Scene;
    isExpanded: boolean;
    onToggle: () => void;
    productionId: string;
    sets: any[];
    assets: any[];
    productionCharacters: any[];
    canEdit: boolean;
    canReview: boolean;
    canAssignAsset: boolean;
    token: string;
    showDeletions: boolean;
    onUpdate: (scene: Scene) => void;
    onSplit: (scene: Scene) => void;
    onSetCreated: (set: any) => void;
    isSubScene: boolean;
}) {
    const hasFlag = scene.changeFlag !== 'NONE';
    const isSkipped = scene.wizardStatus === 'SKIPPED';

    return (
        <div className={`${isSubScene ? 'ml-6 border-l-2 border-neutral-800 pl-3' : ''}`}>
            {/* Row header */}
            <div
                onClick={onToggle}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-neutral-800/40 ${isExpanded ? 'bg-neutral-800/30' : ''}`}
            >
                {/* Expand icon */}
                <div className="text-neutral-600 shrink-0">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>

                {/* Scene number */}
                <span className={`font-mono text-sm font-semibold w-12 shrink-0 ${scene.changeFlag === 'OMITTED' ? 'text-red-400 line-through' : 'text-neutral-200'}`}>
                    {scene.sceneNumber}
                </span>

                {/* INT/EXT badge */}
                <IntExtBadge value={scene.intExt} />

                {/* Scripted location */}
                <span className="flex-1 text-sm text-neutral-300 truncate min-w-0">
                    {scene.scriptedLocationName}
                </span>

                {/* Matched set chip */}
                <div className="hidden md:flex items-center shrink-0">
                    {scene.set ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-800 bg-emerald-900/30 px-2.5 py-0.5 text-xs text-emerald-300">
                            <Box className="h-3 w-3" />
                            {scene.set.name}
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-0.5 text-xs text-neutral-500">
                            Unmatched
                        </span>
                    )}
                </div>

                {/* Time of day */}
                <span className="hidden lg:block text-xs text-neutral-500 w-20 shrink-0 text-center">
                    {TIME_OF_DAY_OPTIONS.find((o) => o.value === scene.timeOfDay)?.label ?? scene.timeOfDay}
                </span>

                {/* Page count */}
                <span className="hidden lg:block text-xs text-neutral-500 w-16 shrink-0 text-center">
                    {scene.pageCount != null ? `${scene.pageCount}p` : '—'}
                </span>

                {/* Character count */}
                <span className="hidden sm:flex text-xs text-neutral-500 w-12 shrink-0 text-center items-center gap-1 justify-center">
                    <Users className="h-3 w-3" />
                    {scene._count.characters}
                </span>

                {/* Asset count */}
                <span className="text-xs text-neutral-500 w-12 shrink-0 text-center flex items-center gap-1 justify-center">
                    <Box className="h-3 w-3" />
                    {scene._count.assets}
                </span>

                {/* Change flag / wizard status */}
                <div className="shrink-0 w-28 flex justify-end items-center gap-1.5">
                    {isSkipped && !hasFlag && (
                        <span className="inline-flex items-center rounded-full border border-amber-800/60 bg-amber-900/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                            Skipped
                        </span>
                    )}
                    {hasFlag && <ChangeFlagPill flag={scene.changeFlag} />}
                    {(hasFlag || isSkipped) && scene.changeReviewed && (
                        <Check className="h-3.5 w-3.5 text-neutral-500" />
                    )}
                </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
                <div>
                    <SceneDetail
                        scene={scene}
                        productionId={productionId}
                        sets={sets}
                        assets={assets}
                        productionCharacters={productionCharacters}
                        canEdit={canEdit}
                        canReview={canReview}
                        canAssignAsset={canAssignAsset}
                        token={token}
                        showDeletions={showDeletions}
                        onUpdate={onUpdate}
                        onSetCreated={onSetCreated}
                    />
                    {/* Split button */}
                    {canEdit && scene._count.children === 0 && (
                        <div className="px-6 pb-4">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSplit(scene);
                                }}
                                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white border border-neutral-700 rounded-md px-3 py-1.5 transition-colors hover:bg-neutral-800"
                            >
                                <Scissors className="h-3.5 w-3.5" />
                                Split Scene
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SceneBreakdownClient({
    initialScenes,
    scriptId,
    productionId,
    sets: initialSets,
    assets,
    productionCharacters,
    canEdit,
    canReview,
    canAssignAsset,
    token,
    showScriptDeletions,
    initialWatermarkName,
}: {
    initialScenes: Scene[];
    scriptId: string;
    productionId: string;
    sets: any[];
    assets: any[];
    productionCharacters: any[];
    canEdit: boolean;
    canReview: boolean;
    canAssignAsset: boolean;
    token: string;
    showScriptDeletions: boolean;
    initialWatermarkName: string | null;
}) {
    const [scenes, setScenes] = useState<Scene[]>(initialScenes);
    const [sets, setSets] = useState<any[]>(initialSets);

    // Watermark filter — per-script, debounced-synced to API (AD/PD only)
    const [watermarkName, setWatermarkName] = useState(initialWatermarkName ?? '');
    const watermarkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleWatermarkChange = useCallback(
        (value: string) => {
            setWatermarkName(value);
            if (watermarkDebounceRef.current) clearTimeout(watermarkDebounceRef.current);
            watermarkDebounceRef.current = setTimeout(() => {
                fetch(`/api/proxy/productions/${productionId}/scripts/${scriptId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ watermarkName: value || null }),
                }).catch(() => { });
            }, 600);
        },
        [productionId, scriptId, token],
    );

    // Deletions toggle — initialised from user preference, debounced-synced to API
    const [showDeletions, setShowDeletions] = useState(showScriptDeletions);
    const toggleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleToggleDeletions = useCallback(
        (next: boolean) => {
            setShowDeletions(next);
            if (toggleDebounceRef.current) clearTimeout(toggleDebounceRef.current);
            toggleDebounceRef.current = setTimeout(() => {
                fetch('/api/proxy/users/me', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ showScriptDeletions: next }),
                }).catch(() => { });
            }, 600);
        },
        [token],
    );

    // Auto-expand the first scene on load
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
        if (initialScenes.length === 0) return new Set();
        const sorted = [...initialScenes].sort((a, b) =>
            compareSceneNumbers(a.sceneNumber, b.sceneNumber),
        );
        return new Set([sorted[0].id]);
    });

    const [showAddPanel, setShowAddPanel] = useState(false);
    const [splitScene, setSplitScene] = useState<Scene | null>(null);
    const [filter, setFilter] = useState<'all' | 'flagged' | 'skipped' | 'by-set'>('all');
    const [setIdFilter, setSetIdFilter] = useState('');
    const [showOmitted, setShowOmitted] = useState(false);

    // Sort scenes by scene number
    const sortedScenes = useMemo(
        () => [...scenes].sort((a, b) => compareSceneNumbers(a.sceneNumber, b.sceneNumber)),
        [scenes],
    );

    // Filter scenes
    const filteredScenes = useMemo(() => {
        let list = sortedScenes;

        if (!showOmitted) {
            list = list.filter((s) => s.changeFlag !== 'OMITTED');
        }

        if (filter === 'flagged') {
            list = list.filter((s) => s.changeFlag !== 'NONE' && !s.changeReviewed);
        } else if (filter === 'skipped') {
            list = list.filter((s) => s.wizardStatus === 'SKIPPED');
        } else if (filter === 'by-set' && setIdFilter) {
            list = list.filter((s) => s.set?.id === setIdFilter);
        }
        return list;
    }, [sortedScenes, filter, setIdFilter, showOmitted]);

    // Unique sets in use
    const usedSets = useMemo(() => {
        const seen = new Map<string, string>();
        sortedScenes.forEach((s) => {
            if (s.set) seen.set(s.set.id, s.set.name);
        });
        return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
    }, [sortedScenes]);

    const existingNumbers = useMemo(() => new Set(scenes.map((s) => s.sceneNumber)), [scenes]);

    const toggleExpanded = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSetCreated = (newSet: any) => {
        setSets((prev) => [...prev, newSet].sort((a, b) => a.name.localeCompare(b.name)));
    };

    const handleSceneCreated = (scene: Scene) => {
        setScenes((prev) => [...prev, scene]);
        setShowAddPanel(false);
    };

    const handleSceneUpdated = (updated: Scene) => {
        setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    };

    const handleSplitResult = (result: { parent: Scene; children: Scene[] }) => {
        setScenes((prev) => {
            const without = prev.filter((s) => s.id !== result.parent.id && !result.children.some((c) => c.id === s.id));
            return [...without, result.parent, ...result.children];
        });
        setSplitScene(null);
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-2">
                    {(['all', 'flagged', 'skipped', 'by-set'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${filter === f
                                ? 'bg-neutral-700 text-white'
                                : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800'
                                }`}
                        >
                            {f === 'all' ? 'All' : f === 'flagged' ? 'Flagged' : f === 'skipped' ? 'Skipped' : 'By Set'}
                        </button>
                    ))}

                    {filter === 'by-set' && (
                        <select
                            value={setIdFilter}
                            onChange={(e) => setSetIdFilter(e.target.value)}
                            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 focus:border-neutral-700 focus:outline-none"
                        >
                            <option value="" className="bg-neutral-900">Select set…</option>
                            {usedSets.map((s) => (
                                <option key={s.id} value={s.id} className="bg-neutral-900">{s.name}</option>
                            ))}
                        </select>
                    )}

                    <div className="flex items-center gap-2 ml-4">
                        <input
                            type="checkbox"
                            id="showOmitted"
                            checked={showOmitted}
                            onChange={(e) => setShowOmitted(e.target.checked)}
                            className="rounded border-neutral-700 bg-neutral-900 text-brand-primary focus:ring-brand-primary"
                        />
                        <label htmlFor="showOmitted" className="text-sm font-medium text-neutral-400 select-none">
                            Show Omitted Scenes
                        </label>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Watermark filter — per-script, AD/PD only */}
                    {canEdit && (
                        <input
                            type="text"
                            value={watermarkName}
                            onChange={(e) => handleWatermarkChange(e.target.value)}
                            placeholder="Watermark filter…"
                            maxLength={100}
                            title="Filter your name from scene text (script-specific)"
                            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none w-44"
                        />
                    )}

                    {/* Show deletions toggle */}
                    <button
                        onClick={() => handleToggleDeletions(!showDeletions)}
                        className="flex items-center gap-2"
                        title={showDeletions ? 'Hide deletions' : 'Show deletions'}
                    >
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 select-none">
                            Show deletions
                        </span>
                        <span
                            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200"
                            style={{ backgroundColor: showDeletions ? '#ef4444' : '#1e293b' }}
                        >
                            <span
                                className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
                                style={{ transform: `translateX(${showDeletions ? '18px' : '2px'})`, marginTop: '2px' }}
                            />
                        </span>
                    </button>

                    {canEdit && (
                        <button
                            onClick={() => setShowAddPanel(true)}
                            className="flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90"
                        >
                            <Plus className="h-4 w-4" />
                            Add Scene
                        </button>
                    )}
                </div>
            </div>

            {/* Scene table */}
            <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                {/* Table header */}
                <div className="hidden md:flex items-center gap-3 px-4 py-2.5 border-b border-neutral-800 bg-neutral-900/50 text-xs uppercase text-neutral-500 font-medium">
                    <div className="w-4 shrink-0" />
                    <div className="w-12 shrink-0">Scene</div>
                    <div className="w-16 shrink-0">I/E</div>
                    <div className="flex-1 min-w-0">Scripted Location</div>
                    <div className="w-36 shrink-0 hidden md:block">Matched Set</div>
                    <div className="w-20 shrink-0 hidden lg:block text-center">Time</div>
                    <div className="w-16 shrink-0 hidden lg:block text-center">Pages</div>
                    <div className="w-12 shrink-0 text-center hidden sm:block">Cast</div>
                    <div className="w-12 shrink-0 text-center">Assets</div>
                    <div className="w-24 shrink-0 text-right">Flag</div>
                </div>

                {/* Rows */}
                {filteredScenes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                        {filter === 'flagged' ? (
                            <p className="text-neutral-500">No unreviewed change flags.</p>
                        ) : filter === 'skipped' ? (
                            <p className="text-neutral-500">No skipped scenes.</p>
                        ) : (
                            <>
                                <FileText className="h-10 w-10 text-neutral-600 mb-3" />
                                <p className="text-neutral-300 font-medium mb-1">
                                    No scenes could be extracted from this script
                                </p>
                                <p className="text-sm text-neutral-500 max-w-sm mb-4">
                                    The PDF may be a scanned image or use a non-standard format.
                                    You can add scenes manually to start the breakdown.
                                </p>
                                {canEdit && (
                                    <button
                                        onClick={() => setShowAddPanel(true)}
                                        className="flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add First Scene
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-800">
                        {filteredScenes.map((scene) => (
                            <SceneRow
                                key={scene.id}
                                scene={scene}
                                isExpanded={expandedIds.has(scene.id)}
                                onToggle={() => toggleExpanded(scene.id)}
                                productionId={productionId}
                                sets={sets}
                                assets={assets}
                                productionCharacters={productionCharacters}
                                canEdit={canEdit}
                                canReview={canReview}
                                canAssignAsset={canAssignAsset}
                                token={token}
                                onUpdate={handleSceneUpdated}
                                onSplit={setSplitScene}
                                onSetCreated={handleSetCreated}
                                isSubScene={!!scene.parentSceneId}
                                showDeletions={showDeletions}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Add Scene slide-out panel */}
            {showAddPanel && (
                <>
                    <div
                        className="fixed inset-0 z-30 bg-black/40"
                        onClick={() => setShowAddPanel(false)}
                    />
                    <AddScenePanel
                        scriptId={scriptId}
                        productionId={productionId}
                        sets={sets}
                        token={token}
                        existingNumbers={existingNumbers}
                        onCreated={handleSceneCreated}
                        onSetCreated={handleSetCreated}
                        onClose={() => setShowAddPanel(false)}
                    />
                </>
            )}

            {/* Split modal */}
            {splitScene && (
                <SplitSceneModal
                    scene={splitScene}
                    productionId={productionId}
                    token={token}
                    existingNumbers={existingNumbers}
                    onSplit={handleSplitResult}
                    onClose={() => setSplitScene(null)}
                />
            )}
        </div>
    );
}
