'use client';

import { useState } from 'react';
import { createApiClient } from '@/lib/api-client';
import { X, Plus } from 'lucide-react';

export default function ScriptedAliasesManager({
    aliases,
    locationId,
    productionId,
    canEdit,
    token,
    onAliasesChange,
}: {
    aliases: string[];
    locationId: string;
    productionId: string;
    canEdit: boolean;
    token: string;
    onAliasesChange: (aliases: string[]) => void;
}) {
    const [newAlias, setNewAlias] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [removingAlias, setRemovingAlias] = useState<string | null>(null);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAlias.trim()) return;

        setIsAdding(true);
        try {
            const client = createApiClient(token);
            // API returns the updated Location with scriptedAliases
            const updated = await client.post<any>(
                `/productions/${productionId}/locations/${locationId}/aliases`,
                { alias: newAlias.trim() }
            );
            setNewAlias('');
            onAliasesChange(updated.scriptedAliases);
        } catch (err: any) {
            alert(err.message || 'Failed to add alias');
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemove = async (alias: string) => {
        if (!confirm(`Are you sure you want to remove the alias "${alias}"?`)) return;
        setRemovingAlias(alias);
        try {
            // DELETE with a body — use raw fetch since createApiClient.delete doesn't support it
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(
                `${apiUrl}/productions/${productionId}/locations/${locationId}/aliases`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ alias }),
                }
            );
            if (!res.ok) {
                const errBody = await res.json().catch(() => null);
                throw new Error(errBody?.message || 'Failed to remove alias');
            }
            // API returns the updated Location with scriptedAliases
            const updated = await res.json();
            onAliasesChange(updated.scriptedAliases);
        } catch (err: any) {
            alert(err.message || 'Failed to remove alias');
        } finally {
            setRemovingAlias(null);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {aliases.length === 0 ? (
                <p className="text-sm text-neutral-500 italic">No scripted aliases added yet.</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {aliases.map((alias) => (
                        <div
                            key={alias}
                            className="flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800 py-1 pl-3 pr-1 text-sm text-neutral-200"
                        >
                            <span>{alias}</span>
                            {canEdit && (
                                <button
                                    onClick={() => handleRemove(alias)}
                                    disabled={removingAlias === alias}
                                    className="rounded-full p-1 text-neutral-500 transition-colors hover:bg-neutral-700 hover:text-white disabled:opacity-50"
                                    aria-label="Remove alias"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {canEdit && (
                <form onSubmit={handleAdd} className="mt-2 flex max-w-sm items-center gap-2">
                    <input
                        type="text"
                        placeholder="New alias name..."
                        value={newAlias}
                        onChange={(e) => setNewAlias(e.target.value)}
                        disabled={isAdding}
                        className="flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-white placeholder:text-neutral-500 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={isAdding || !newAlias.trim()}
                        className="flex items-center gap-1.5 rounded-md bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="h-4 w-4" />
                        Add
                    </button>
                </form>
            )}
        </div>
    );
}
