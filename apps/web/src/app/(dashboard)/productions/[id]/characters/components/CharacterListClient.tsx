'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function CharacterListClient({
    initialCharacters,
    productionId,
    canCreate,
    token,
}: {
    initialCharacters: any[];
    productionId: string;
    canCreate: boolean;
    token: string;
}) {
    const router = useRouter();
    const [characters, setCharacters] = useState(initialCharacters);
    const [search, setSearch] = useState('');
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [createError, setCreateError] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const filtered = characters.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = async (characterId: string) => {
        setDeletingId(characterId);
        try {
            const apiUrl = '/api/proxy';
            const res = await fetch(`${apiUrl}/productions/${productionId}/characters/${characterId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            setCharacters((prev) => prev.filter((c) => c.id !== characterId));
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setCreateError('');

        try {
            const apiUrl = '/api/proxy';
            const res = await fetch(`${apiUrl}/productions/${productionId}/characters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: newName.trim() }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setCreateError(err.message || 'Failed to create character');
                return;
            }

            const created = await res.json();
            setCharacters((prev) => [...prev, { ...created, sceneCount: 0, assetCount: 0 }]);
            setNewName('');
            setCreating(false);
            router.refresh();
        } catch {
            setCreateError('Failed to create character');
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Search + inline create */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search characters…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-700 rounded-md text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-primary"
                    />
                </div>
                {canCreate && !creating && (
                    <button
                        onClick={() => setCreating(true)}
                        className="text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
                    >
                        + Quick add
                    </button>
                )}
            </div>

            {/* Quick create inline form */}
            {creating && (
                <form
                    onSubmit={handleCreate}
                    className="flex items-center gap-2 p-3 bg-neutral-900 border border-brand-primary/30 rounded-lg"
                >
                    <input
                        autoFocus
                        type="text"
                        placeholder="Character name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 outline-none"
                    />
                    {createError && (
                        <span className="text-xs text-red-400">{createError}</span>
                    )}
                    <button
                        type="submit"
                        className="px-3 py-1 bg-brand-primary rounded text-xs font-medium text-white hover:bg-brand-primary/90"
                    >
                        Add
                    </button>
                    <button
                        type="button"
                        onClick={() => { setCreating(false); setNewName(''); setCreateError(''); }}
                        className="px-3 py-1 bg-neutral-700 rounded text-xs text-neutral-300 hover:bg-neutral-600"
                    >
                        Cancel
                    </button>
                </form>
            )}

            {/* Character list */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                    <User className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">
                        {search ? 'No characters match your search.' : 'No characters yet.'}
                    </p>
                    {!search && canCreate && (
                        <p className="text-xs mt-1 text-neutral-600">
                            Characters are added automatically during scene breakdown, or create one above.
                        </p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 divide-y divide-neutral-800 rounded-xl border border-neutral-800 overflow-hidden">
                    {filtered.map((character) => (
                        <div
                            key={character.id}
                            className="flex items-center bg-neutral-950 hover:bg-neutral-900 transition-colors group"
                        >
                            {/* Clickable name + stats area */}
                            <Link
                                href={`/productions/${productionId}/characters/${character.id}`}
                                className="flex items-center justify-between flex-1 min-w-0 px-4 py-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                                        <User className="w-4 h-4 text-neutral-400" />
                                    </div>
                                    <span className="text-sm font-medium text-white truncate group-hover:text-brand-primary transition-colors">
                                        {character.name}
                                    </span>
                                    {character.height && (
                                        <span className="text-xs text-neutral-500 shrink-0">{character.height}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 shrink-0 ml-4">
                                    <span className="text-xs text-neutral-500">
                                        {character.sceneCount} {character.sceneCount === 1 ? 'scene' : 'scenes'}
                                    </span>
                                    <span className="text-xs text-neutral-500">
                                        {character.assetCount} {character.assetCount === 1 ? 'asset' : 'assets'}
                                    </span>
                                    <span className="text-neutral-600 group-hover:text-neutral-400 transition-colors text-sm">→</span>
                                </div>
                            </Link>

                            {/* Delete controls (AD/PD only) */}
                            {canCreate && (
                                <div className="pr-3 shrink-0">
                                    {confirmDeleteId === character.id ? (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => handleDelete(character.id)}
                                                disabled={deletingId === character.id}
                                                className="px-2 py-1 bg-red-700 rounded text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                                            >
                                                {deletingId === character.id ? '…' : 'Delete'}
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="px-2 py-1 bg-neutral-700 rounded text-xs text-neutral-300 hover:bg-neutral-600"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDeleteId(character.id)}
                                            className="p-1.5 text-neutral-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete character"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
