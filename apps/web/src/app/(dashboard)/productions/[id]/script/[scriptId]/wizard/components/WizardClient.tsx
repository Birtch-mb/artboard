'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import SceneDiffText from '../../components/SceneDiffText';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft,
    ChevronRight,
    SkipForward,
    Save,
    Check,
    MapPin,
    Box,
    Users,
    Plus,
    X,
    Search,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Scene {
    id: string;
    sceneNumber: string;
    intExt: string;
    scriptedLocationName: string;
    timeOfDay: string;
    synopsis: string | null;
    notes: string | null;
    sceneText: string | null;
    changeFlag?: string;
    wizardStatus: 'PENDING' | 'COMPLETE' | 'SKIPPED';
    set: { id: string; name: string } | null;
}

interface SetLocation { location: { id: string; name: string }; }
interface ProductionSet { id: string; name: string; locations: SetLocation[]; }
interface Asset { id: string; name: string; category: string; }
interface Character { id: string; name: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const INT_EXT_LABELS: Record<string, string> = { INT: 'INT', EXT: 'EXT', INT_EXT: 'INT/EXT' };
const TIME_OF_DAY_LABELS: Record<string, string> = {
    DAY: 'Day', NIGHT: 'Night', DAWN: 'Dawn', DUSK: 'Dusk',
    CONTINUOUS: 'Continuous', LATER: 'Later', MOMENTS_LATER: 'Moments Later',
};

const ASSET_CATEGORY_OPTIONS = [
    { value: 'PROPS', label: 'Props' },
    { value: 'SET_DRESSING', label: 'Set Dressing' },
    { value: 'GRAPHICS', label: 'Graphics' },
    { value: 'FURNITURE', label: 'Furniture' },
    { value: 'VEHICLES', label: 'Vehicles' },
    { value: 'EXPENDABLES', label: 'Expendables' },
    { value: 'SOFT_FURNISHINGS', label: 'Soft Furnishings' },
    { value: 'GREENS', label: 'Greens' },
    { value: 'WEAPONS', label: 'Weapons' },
    { value: 'FOOD', label: 'Food' },
    { value: 'ANIMALS', label: 'Animals' },
    { value: 'SPECIAL_EFFECTS', label: 'Special Effects' },
    { value: 'OTHER', label: 'Other' },
];

function slugline(scene: Scene): string {
    return `${INT_EXT_LABELS[scene.intExt] ?? scene.intExt}. ${scene.scriptedLocationName} — ${TIME_OF_DAY_LABELS[scene.timeOfDay] ?? scene.timeOfDay}`;
}

// ─── Create Character Modal ───────────────────────────────────────────────────

function CreateCharacterModal({
    productionId,
    sceneId,
    apiUrl,
    token,
    onClose,
    onCreated,
}: {
    productionId: string;
    sceneId: string;
    apiUrl: string;
    token: string;
    onClose: () => void;
    onCreated: (char: Character) => void;
}) {
    const [name, setName] = useState('');
    const [height, setHeight] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || submitting) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`${apiUrl}/productions/${productionId}/characters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: name.trim(),
                    height: height.trim() || undefined,
                    notes: notes.trim() || undefined,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setError(err.message || 'Failed to create character');
                return;
            }
            const newChar: Character = await res.json();

            // Assign to current scene (best-effort)
            await fetch(`${apiUrl}/productions/${productionId}/scenes/${sceneId}/characters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ characterId: newChar.id }),
            }).catch(() => { });

            onCreated(newChar);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to create character');
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls = 'w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/40';
    const labelCls = 'block text-xs font-medium text-neutral-400 mb-1';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-sm mx-4 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                    <h2 className="text-sm font-semibold text-white">New Character</h2>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                    <div>
                        <label className={labelCls}>Name <span className="text-red-400">*</span></label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="e.g. John Smith"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={inputCls}
                            required
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Height</label>
                        <input
                            type="text"
                            placeholder="e.g. 5′10″"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Notes</label>
                        <textarea
                            rows={3}
                            placeholder="Any notes about this character…"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={`${inputCls} resize-none`}
                        />
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <div className="flex items-center gap-2 pt-1">
                        <button
                            type="submit"
                            disabled={submitting || !name.trim()}
                            className="flex-1 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting ? 'Creating…' : 'Create & Assign'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-md border border-neutral-700 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Create Asset Modal ───────────────────────────────────────────────────────

function CreateAssetModal({
    productionId,
    sceneId,
    apiUrl,
    token,
    onClose,
    onCreated,
}: {
    productionId: string;
    sceneId: string;
    apiUrl: string;
    token: string;
    onClose: () => void;
    onCreated: (asset: Asset) => void;
}) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('PROPS');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || submitting) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`${apiUrl}/productions/${productionId}/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: name.trim(),
                    category,
                    notes: notes.trim() || undefined,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setError(err.message || 'Failed to create asset');
                return;
            }
            const newAsset: Asset = await res.json();

            // Assign to current scene (best-effort)
            await fetch(`${apiUrl}/productions/${productionId}/scenes/${sceneId}/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ assetId: newAsset.id }),
            }).catch(() => { });

            onCreated(newAsset);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to create asset');
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls = 'w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/40';
    const labelCls = 'block text-xs font-medium text-neutral-400 mb-1';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-sm mx-4 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                    <h2 className="text-sm font-semibold text-white">New Asset</h2>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                    <div>
                        <label className={labelCls}>Name <span className="text-red-400">*</span></label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="e.g. Hero sword"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={inputCls}
                            required
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Category <span className="text-red-400">*</span></label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={inputCls}
                        >
                            {ASSET_CATEGORY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-neutral-900">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Notes</label>
                        <textarea
                            rows={3}
                            placeholder="Any notes about this asset…"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={`${inputCls} resize-none`}
                        />
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <div className="flex items-center gap-2 pt-1">
                        <button
                            type="submit"
                            disabled={submitting || !name.trim()}
                            className="flex-1 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting ? 'Creating…' : 'Create & Assign'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-md border border-neutral-700 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Create Set Modal ─────────────────────────────────────────────────────────

function CreateSetModal({
    productionId,
    apiUrl,
    token,
    onClose,
    onCreated,
}: {
    productionId: string;
    apiUrl: string;
    token: string;
    onClose: () => void;
    onCreated: (set: ProductionSet) => void;
}) {
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || submitting) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`${apiUrl}/productions/${productionId}/sets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: name.trim(), status: 'IDEATION' }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setError(err.message || 'Failed to create set');
                return;
            }
            const newSet: ProductionSet = await res.json();
            onCreated(newSet);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to create set');
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls = 'w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/40';
    const labelCls = 'block text-xs font-medium text-neutral-400 mb-1';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-sm mx-4 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                    <h2 className="text-sm font-semibold text-white">New Set</h2>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                    <div>
                        <label className={labelCls}>Name <span className="text-red-400">*</span></label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="e.g. Living Room, Stage 4"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={inputCls}
                            required
                        />
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <div className="flex items-center gap-2 pt-1">
                        <button
                            type="submit"
                            disabled={submitting || !name.trim()}
                            className="flex-1 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting ? 'Creating…' : 'Create Set'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-md border border-neutral-700 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Completion Screen ────────────────────────────────────────────────────────

function CompletionScreen({
    scriptId,
    productionId,
    completedCount,
    skippedCount,
    token,
}: {
    scriptId: string;
    productionId: string;
    completedCount: number;
    skippedCount: number;
    token: string;
}) {
    const router = useRouter();
    const apiUrl = '/api/proxy';

    const handleGoToBreakdown = async () => {
        await fetch(`${apiUrl}/productions/${productionId}/scripts/${scriptId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ wizardComplete: true }),
        }).catch(() => { });
        router.push(`/productions/${productionId}/script/${scriptId}`);
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <div className="text-center max-w-md px-6">
                <div className="flex justify-center mb-6">
                    <div className="flex items-center justify-center rounded-full bg-brand-primary/10 border border-brand-primary/30 h-20 w-20">
                        <Check className="h-10 w-10 text-brand-primary" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">Breakdown Complete</h1>
                <p className="text-neutral-400 mb-1">
                    <span className="text-white font-semibold">{completedCount}</span>{' '}
                    scene{completedCount !== 1 ? 's' : ''} broken down
                    {skippedCount > 0 && (
                        <>, <span className="text-amber-400 font-semibold">{skippedCount}</span> skipped</>
                    )}
                </p>
                {skippedCount > 0 && (
                    <p className="text-sm text-neutral-500 mb-2">
                        Skipped scenes are marked in the breakdown view — return to them when ready.
                    </p>
                )}
                <button
                    onClick={handleGoToBreakdown}
                    className="mt-6 rounded-lg bg-brand-primary px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-primary/90"
                >
                    Go to Scene Breakdown View
                </button>
            </div>
        </div>
    );
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

export default function WizardClient({
    script,
    initialScenes,
    productionId,
    sets: initialSets,
    assets: initialAssets,
    characters: initialCharacters,
    token,
}: {
    script: any;
    initialScenes: Scene[];
    productionId: string;
    sets: ProductionSet[];
    assets: Asset[];
    characters: Character[];
    token: string;
}) {
    const router = useRouter();
    const apiUrl = '/api/proxy';

    // Sort top-level scenes only (no sub-scenes in wizard)
    const sortedScenes = [...initialScenes]
        .filter((s) => !('parentSceneId' in s && (s as any).parentSceneId))
        .sort((a, b) => compareSceneNumbers(a.sceneNumber, b.sceneNumber));

    const [scenes, setScenes] = useState<Scene[]>(sortedScenes);
    const [sets, setSets] = useState<ProductionSet[]>(initialSets);
    const [characters, setCharacters] = useState<Character[]>(initialCharacters);
    const [allAssets, setAllAssets] = useState<Asset[]>(initialAssets);

    // Index: resume from first incomplete scene
    const getInitialIndex = (sc: Scene[]) => {
        const firstPending = sc.findIndex((s) => s.wizardStatus === 'PENDING');
        if (firstPending !== -1) return firstPending;
        const firstSkipped = sc.findIndex((s) => s.wizardStatus === 'SKIPPED');
        if (firstSkipped !== -1) return firstSkipped;
        return 0;
    };
    const [currentIndex, setCurrentIndex] = useState(() => getInitialIndex(sortedScenes));
    const [navigating, setNavigating] = useState(false);
    const [showComplete, setShowComplete] = useState(false);

    // Editable fields for current scene (lifted state)
    const [synopsis, setSynopsis] = useState('');
    const [notes, setNotes] = useState('');
    const [setId, setSetId] = useState('');

    // Per-scene assets/characters/diff (loaded from API)
    const [sceneAssets, setSceneAssets] = useState<Asset[]>([]);
    const [sceneCharacters, setSceneCharacters] = useState<Character[]>([]);
    const [previousRawText, setPreviousRawText] = useState<string | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Modals
    const [showCreateChar, setShowCreateChar] = useState(false);
    const [showCreateAsset, setShowCreateAsset] = useState(false);
    const [showCreateSet, setShowCreateSet] = useState(false);

    const currentScene = scenes[currentIndex];
    const total = scenes.length;

    // Reset editable state when scene changes
    useEffect(() => {
        if (!currentScene) return;
        setSynopsis(currentScene.synopsis ?? '');
        setNotes(currentScene.notes ?? '');
        setSetId(currentScene.set?.id ?? '');
        setSceneAssets([]);
        setSceneCharacters([]);
        setPreviousRawText(null);
        setShowCreateChar(false);
        setShowCreateAsset(false);

        // Load full detail
        setLoadingDetail(true);
        fetch(`${apiUrl}/productions/${productionId}/scenes/${currentScene.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                setSceneAssets(data.assets ?? []);
                setSceneCharacters(data.characters ?? []);
                setPreviousRawText(data.previousRawText ?? null);
                // Hydrate sceneText — not included in list endpoint, only in detail
                if (data.sceneText != null) {
                    setScenes((prev) =>
                        prev.map((s) =>
                            s.id === currentScene.id ? { ...s, sceneText: data.sceneText } : s,
                        ),
                    );
                }
            })
            .catch(() => { })
            .finally(() => setLoadingDetail(false));
    }, [currentScene?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Save current scene's editable fields to API
    const saveCurrentFields = useCallback(async () => {
        if (!currentScene) return;
        const body: Record<string, any> = {
            synopsis: synopsis.trim() || null,
            notes: notes.trim() || null,
        };
        await fetch(`${apiUrl}/productions/${productionId}/scenes/${currentScene.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        }).catch(() => { });

        if (setId !== (currentScene.set?.id ?? '')) {
            await fetch(`${apiUrl}/productions/${productionId}/scenes/${currentScene.id}/set`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ setId: setId || null }),
            }).catch(() => { });
        }

        // Update local scene state
        setScenes((prev) =>
            prev.map((s) =>
                s.id === currentScene.id
                    ? {
                        ...s,
                        synopsis: synopsis.trim() || null,
                        notes: notes.trim() || null,
                        set: setId ? (sets.find((st) => st.id === setId) ?? s.set) : null,
                    }
                    : s,
            ),
        );
    }, [currentScene, synopsis, notes, setId, apiUrl, productionId, token, sets]);

    const setWizardStatus = useCallback(
        async (sceneId: string, status: 'COMPLETE' | 'SKIPPED') => {
            await fetch(`${apiUrl}/productions/${productionId}/scenes/${sceneId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ wizardStatus: status }),
            }).catch(() => { });
            setScenes((prev) =>
                prev.map((s) => (s.id === sceneId ? { ...s, wizardStatus: status } : s)),
            );
        },
        [apiUrl, productionId, token],
    );

    const checkAllDone = useCallback((updatedScenes: Scene[]) => {
        return updatedScenes.every((s) => s.wizardStatus !== 'PENDING');
    }, []);

    const handleNext = useCallback(async () => {
        if (navigating || !currentScene) return;
        setNavigating(true);
        try {
            await saveCurrentFields();
            await setWizardStatus(currentScene.id, 'COMPLETE');
            const updated = scenes.map((s) =>
                s.id === currentScene.id ? { ...s, wizardStatus: 'COMPLETE' as const } : s,
            );
            if (currentIndex < total - 1) {
                setCurrentIndex(currentIndex + 1);
            } else if (checkAllDone(updated)) {
                setShowComplete(true);
            }
        } finally {
            setNavigating(false);
        }
    }, [navigating, currentScene, saveCurrentFields, setWizardStatus, scenes, currentIndex, total, checkAllDone]);

    const handlePrevious = useCallback(async () => {
        if (navigating || currentIndex === 0) return;
        setNavigating(true);
        try {
            await saveCurrentFields();
            setCurrentIndex(currentIndex - 1);
        } finally {
            setNavigating(false);
        }
    }, [navigating, currentIndex, saveCurrentFields]);

    const handleSkip = useCallback(async () => {
        if (navigating || !currentScene) return;
        setNavigating(true);
        try {
            await setWizardStatus(currentScene.id, 'SKIPPED');
            const updated = scenes.map((s) =>
                s.id === currentScene.id ? { ...s, wizardStatus: 'SKIPPED' as const } : s,
            );
            if (currentIndex < total - 1) {
                setCurrentIndex(currentIndex + 1);
            } else if (checkAllDone(updated)) {
                setShowComplete(true);
            }
        } finally {
            setNavigating(false);
        }
    }, [navigating, currentScene, setWizardStatus, scenes, currentIndex, total, checkAllDone]);

    const handleSaveAndExit = useCallback(async () => {
        if (navigating) return;
        setNavigating(true);
        try {
            await saveCurrentFields();
            router.push(`/productions/${productionId}/script/${script.id}`);
        } finally {
            setNavigating(false);
        }
    }, [navigating, saveCurrentFields, router, productionId, script.id]);

    // Asset operations
    const handleAssignAsset = async (assetId: string) => {
        await fetch(`${apiUrl}/productions/${productionId}/scenes/${currentScene!.id}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ assetId }),
        }).catch(() => { });
        const asset = allAssets.find((a) => a.id === assetId);
        if (asset) setSceneAssets((prev) => [...prev, asset]);
    };
    const handleRemoveAsset = async (assetId: string) => {
        await fetch(`${apiUrl}/productions/${productionId}/scenes/${currentScene!.id}/assets/${assetId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }).catch(() => { });
        setSceneAssets((prev) => prev.filter((a) => a.id !== assetId));
    };

    // Character operations
    const handleAssignCharacter = async (characterId: string) => {
        await fetch(`${apiUrl}/productions/${productionId}/scenes/${currentScene!.id}/characters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ characterId }),
        }).catch(() => { });
        const char = characters.find((c) => c.id === characterId);
        if (char) setSceneCharacters((prev) => [...prev, char]);
    };
    const handleRemoveCharacter = async (characterId: string) => {
        await fetch(`${apiUrl}/productions/${productionId}/scenes/${currentScene!.id}/characters/${characterId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }).catch(() => { });
        setSceneCharacters((prev) => prev.filter((c) => c.id !== characterId));
    };

    // Called by CreateCharacterModal on success
    const handleCharacterCreated = (newChar: Character) => {
        setCharacters((prev) => [...prev, newChar].sort((a, b) => a.name.localeCompare(b.name)));
        setSceneCharacters((prev) => [...prev, newChar]);
    };

    // Called by CreateAssetModal on success
    const handleAssetCreated = (newAsset: Asset) => {
        setAllAssets((prev) => [...prev, newAsset].sort((a, b) => a.name.localeCompare(b.name)));
        setSceneAssets((prev) => [...prev, newAsset]);
    };

    // Called by CreateSetModal on success
    const handleSetCreated = (newSet: ProductionSet) => {
        setSets((prev) => [...prev, newSet].sort((a, b) => a.name.localeCompare(b.name)));
        setSetId(newSet.id);
    };

    const completedCount = scenes.filter((s) => s.wizardStatus === 'COMPLETE').length;
    const skippedCount = scenes.filter((s) => s.wizardStatus === 'SKIPPED').length;
    const progress = total > 0 ? ((completedCount + skippedCount) / total) * 100 : 0;

    if (total === 0) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="text-center max-w-sm px-6">
                    <h1 className="text-2xl font-bold text-white mb-3">No scenes to break down</h1>
                    <p className="text-neutral-400 mb-6 text-sm">
                        No scenes were extracted from this script. Add scenes manually in the breakdown view.
                    </p>
                    <button
                        onClick={() => router.push(`/productions/${productionId}/script/${script.id}`)}
                        className="rounded-lg bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary/90"
                    >
                        Go to Breakdown View
                    </button>
                </div>
            </div>
        );
    }

    if (showComplete) {
        return (
            <CompletionScreen
                scriptId={script.id}
                productionId={productionId}
                completedCount={completedCount}
                skippedCount={skippedCount}
                token={token}
            />
        );
    }

    const inputCls = 'w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700';
    const labelCls = 'block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider';

    return (
        <>
            <div className="fixed inset-0 bg-neutral-950 flex flex-col overflow-hidden">
                {/* ─── Header ─────────────────────────────────────────────────── */}
                <div className="flex items-center gap-4 border-b border-neutral-800 px-6 py-3 shrink-0 bg-neutral-950">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                            <span className="text-sm font-medium text-neutral-300">
                                Scene {currentIndex + 1} of {total}
                            </span>
                            {currentScene?.wizardStatus === 'SKIPPED' && (
                                <span className="inline-flex items-center rounded-full border border-amber-800 bg-amber-900/30 px-2 py-0.5 text-xs text-amber-300">
                                    Skipped
                                </span>
                            )}
                            {currentScene?.wizardStatus === 'COMPLETE' && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-800 bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-300">
                                    <Check className="h-3 w-3" /> Done
                                </span>
                            )}
                        </div>
                        {/* Progress bar */}
                        <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-brand-primary transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-neutral-600">{Math.round(progress)}% complete</span>
                        <button
                            onClick={handleSaveAndExit}
                            disabled={navigating}
                            className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700 transition-colors disabled:opacity-50"
                        >
                            <Save className="h-3.5 w-3.5" />
                            Save &amp; Exit
                        </button>
                    </div>
                </div>

                {/* ─── Two-panel layout ───────────────────────────────────────── */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left: script text */}
                    <div className="w-[46%] min-w-[300px] max-w-[600px] border-r border-neutral-800 flex flex-col overflow-hidden bg-neutral-950">
                        <div className="px-6 py-4 border-b border-neutral-800 shrink-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-mono text-sm font-bold text-brand-primary">
                                    {currentScene?.sceneNumber}
                                </span>
                                <span className="inline-flex items-center rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-300 tracking-wide">
                                    {INT_EXT_LABELS[currentScene?.intExt] ?? currentScene?.intExt}
                                </span>
                            </div>
                            <p className="text-sm font-medium text-white leading-snug">
                                {currentScene && slugline(currentScene)}
                            </p>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-white px-8 py-6">
                            {currentScene?.sceneText ? (
                                <pre className="whitespace-pre-wrap font-courier-prime font-bold text-sm text-neutral-900 leading-relaxed">
                                    {currentScene.changeFlag && currentScene.changeFlag !== 'NONE' && currentScene.changeFlag !== 'OMITTED' ? (
                                        <SceneDiffText
                                            newText={currentScene.sceneText}
                                            previousText={previousRawText}
                                            showDeletions={true}
                                        />
                                    ) : (
                                        currentScene.sceneText
                                    )}
                                </pre>
                            ) : (
                                <p className="text-sm text-neutral-600 italic">
                                    No script text available for this scene.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right: editable breakdown fields */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            {/* Set */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Box className="h-3 w-3" /> Set
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateSet(true)}
                                        className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary/80 transition-colors"
                                    >
                                        <Plus className="h-3 w-3" />
                                        New
                                    </button>
                                </div>
                                <select
                                    value={setId}
                                    onChange={(e) => setSetId(e.target.value)}
                                    className={inputCls}
                                >
                                    <option value="" className="bg-neutral-900">Unmatched — resolve later</option>
                                    {sets.map((s) => (
                                        <option key={s.id} value={s.id} className="bg-neutral-900">{s.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-neutral-600 mt-1">
                                    Scripted: {currentScene?.scriptedLocationName}
                                </p>
                            </div>

                            {/* Location — derived from selected Set */}
                            <div>
                                <label className={labelCls}>
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="h-3 w-3" /> Location
                                    </span>
                                </label>
                                {setId ? (
                                    (() => {
                                        const selectedSet = sets.find((s) => s.id === setId);
                                        const locs = selectedSet?.locations?.map((sl) => sl.location) ?? [];
                                        return locs.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {locs.map((loc) => (
                                                    <span
                                                        key={loc.id}
                                                        className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300"
                                                    >
                                                        <MapPin className="h-3 w-3 text-neutral-500" />
                                                        {loc.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-neutral-600 italic">No location linked to this set</p>
                                        );
                                    })()
                                ) : (
                                    <p className="text-xs text-neutral-600 italic">Select a set to see its location</p>
                                )}
                            </div>

                            {/* Characters */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Users className="h-3 w-3" /> Characters
                                    </p>
                                    <button
                                        onClick={() => setShowCreateChar(true)}
                                        className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary/80 transition-colors"
                                    >
                                        <Plus className="h-3 w-3" />
                                        New
                                    </button>
                                </div>
                                {loadingDetail ? (
                                    <p className="text-xs text-neutral-600">Loading…</p>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {sceneCharacters.map((c) => (
                                                <span
                                                    key={c.id}
                                                    className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-neutral-200"
                                                >
                                                    {c.name}
                                                    <button
                                                        onClick={() => handleRemoveCharacter(c.id)}
                                                        className="text-neutral-500 hover:text-red-400 transition-colors ml-0.5"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                            {sceneCharacters.length === 0 && (
                                                <span className="text-xs text-neutral-600 italic">No characters assigned</span>
                                            )}
                                        </div>
                                        <CharacterSearch
                                            characters={characters}
                                            assignedIds={new Set(sceneCharacters.map((c) => c.id))}
                                            onAssign={handleAssignCharacter}
                                        />
                                    </>
                                )}
                            </div>

                            {/* Assets */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Box className="h-3 w-3" /> Assets
                                    </p>
                                    <button
                                        onClick={() => setShowCreateAsset(true)}
                                        className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary/80 transition-colors"
                                    >
                                        <Plus className="h-3 w-3" />
                                        New
                                    </button>
                                </div>
                                {loadingDetail ? (
                                    <p className="text-xs text-neutral-600">Loading…</p>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {sceneAssets.map((a) => (
                                                <span
                                                    key={a.id}
                                                    className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300"
                                                >
                                                    {a.name}
                                                    <button
                                                        onClick={() => handleRemoveAsset(a.id)}
                                                        className="text-neutral-500 hover:text-red-400 transition-colors ml-0.5"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                            {sceneAssets.length === 0 && (
                                                <span className="text-xs text-neutral-600 italic">No assets assigned</span>
                                            )}
                                        </div>
                                        <AssetSearch
                                            assets={allAssets}
                                            assignedIds={new Set(sceneAssets.map((a) => a.id))}
                                            onAssign={handleAssignAsset}
                                        />
                                    </>
                                )}
                            </div>

                            {/* Synopsis */}
                            <div>
                                <label className={labelCls}>Synopsis</label>
                                <textarea
                                    rows={3}
                                    placeholder="Brief description of what happens in this scene"
                                    value={synopsis}
                                    onChange={(e) => setSynopsis(e.target.value)}
                                    className={`${inputCls} resize-none`}
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className={labelCls}>Notes</label>
                                <textarea
                                    rows={2}
                                    placeholder="Any breakdown notes for this scene"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className={`${inputCls} resize-none`}
                                />
                            </div>
                        </div>

                        {/* Navigation footer */}
                        <div className="border-t border-neutral-800 px-6 py-4 flex items-center justify-between shrink-0 bg-neutral-950">
                            <button
                                onClick={handlePrevious}
                                disabled={navigating || currentIndex === 0}
                                className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </button>

                            <button
                                onClick={handleSkip}
                                disabled={navigating}
                                className="flex items-center gap-1.5 rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors disabled:opacity-40"
                            >
                                <SkipForward className="h-4 w-4" />
                                Skip
                            </button>

                            <button
                                onClick={handleNext}
                                disabled={navigating}
                                className="flex items-center gap-1.5 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {navigating
                                    ? 'Saving…'
                                    : currentIndex === total - 1
                                        ? 'Finish'
                                        : 'Next Scene'}
                                {!navigating && <ChevronRight className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Modals (rendered outside the fixed container) ──────────── */}
            {showCreateChar && currentScene && (
                <CreateCharacterModal
                    productionId={productionId}
                    sceneId={currentScene.id}
                    apiUrl={apiUrl}
                    token={token}
                    onClose={() => setShowCreateChar(false)}
                    onCreated={handleCharacterCreated}
                />
            )}
            {showCreateAsset && currentScene && (
                <CreateAssetModal
                    productionId={productionId}
                    sceneId={currentScene.id}
                    apiUrl={apiUrl}
                    token={token}
                    onClose={() => setShowCreateAsset(false)}
                    onCreated={handleAssetCreated}
                />
            )}
            {showCreateSet && (
                <CreateSetModal
                    productionId={productionId}
                    apiUrl={apiUrl}
                    token={token}
                    onClose={() => setShowCreateSet(false)}
                    onCreated={handleSetCreated}
                />
            )}
        </>
    );
}

// ─── Search sub-components (stable, no re-render on parent state change) ──────

function CharacterSearch({
    characters,
    assignedIds,
    onAssign,
}: {
    characters: Character[];
    assignedIds: Set<string>;
    onAssign: (id: string) => Promise<void>;
}) {
    const [search, setSearch] = useState('');
    const filtered = characters
        .filter((c) => !assignedIds.has(c.id))
        .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <input
                type="text"
                placeholder="Search existing characters…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-3 text-xs text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none"
            />
            {search.trim() !== '' && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border border-neutral-800 bg-neutral-900 shadow-lg max-h-32 overflow-y-auto">
                    {filtered.slice(0, 15).map((c) => (
                        <button
                            key={c.id}
                            onClick={() => { onAssign(c.id); setSearch(''); }}
                            className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function AssetSearch({
    assets,
    assignedIds,
    onAssign,
}: {
    assets: Asset[];
    assignedIds: Set<string>;
    onAssign: (id: string) => Promise<void>;
}) {
    const [search, setSearch] = useState('');
    const filtered = assets
        .filter((a) => !assignedIds.has(a.id))
        .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <input
                type="text"
                placeholder="Search assets to add…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-3 text-xs text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none"
            />
            {search.trim() !== '' && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border border-neutral-800 bg-neutral-900 shadow-lg max-h-32 overflow-y-auto">
                    {filtered.slice(0, 20).map((a) => (
                        <button
                            key={a.id}
                            onClick={() => { onAssign(a.id); setSearch(''); }}
                            className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
                        >
                            {a.name}
                            <span className="text-neutral-600 ml-1">({a.category})</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
