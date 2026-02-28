'use client';

import { useState, useEffect } from 'react';
import { createApiClient } from '@/lib/api-client';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface GanttPhase {
    id: string;
    name: string;
    color: string;
    sortOrder: number;
}

export function GanttSettings({ productionId, token }: { productionId: string; token: string }) {
    const [phases, setPhases] = useState<GanttPhase[]>([]);
    const [newPhaseName, setNewPhaseName] = useState('');
    const [newPhaseColor, setNewPhaseColor] = useState('#3b82f6');
    const [loading, setLoading] = useState(true);

    const client = createApiClient(token);

    useEffect(() => {
        loadPhases();
    }, []);

    const loadPhases = async () => {
        try {
            setLoading(true);
            const data = await client.get(`/productions/${productionId}/gantt-phases`) as GanttPhase[];
            setPhases(data || []);
        } catch (err) {
            console.error('Failed to load Gantt phases', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPhase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPhaseName.trim()) return;

        try {
            const newPhase = await client.post(`/productions/${productionId}/gantt-phases`, {
                name: newPhaseName,
                color: newPhaseColor,
                sortOrder: phases.length,
            }) as GanttPhase;

            setPhases([...phases, newPhase]);
            setNewPhaseName('');
        } catch (err) {
            console.error('Failed to add Gantt phase', err);
        }
    };

    const handleDeletePhase = async (id: string) => {
        try {
            await client.delete(`/productions/${productionId}/gantt-phases/${id}`);
            setPhases(phases.filter(p => p.id !== id));
        } catch (err) {
            console.error('Failed to delete Gantt phase', err);
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold text-white">Gantt Phase Vocabulary</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">
                Define the custom phases for Sets in your production (e.g., Design, Construction, Dress).
            </p>

            {loading ? (
                <div className="text-sm text-gray-500">Loading phases...</div>
            ) : (
                <div className="space-y-3">
                    {phases.length === 0 ? (
                        <div className="text-sm text-gray-500 py-3 text-center border border-dashed border-gray-800 rounded">
                            No custom phases defined.
                        </div>
                    ) : (
                        phases.map((phase) => (
                            <div key={phase.id} className="flex items-center justify-between p-3 bg-gray-950 rounded border border-gray-800">
                                <div className="flex items-center gap-3">
                                    <GripVertical className="w-4 h-4 text-gray-600 cursor-grab" />
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: phase.color }} />
                                    <span className="text-sm font-medium text-gray-200">{phase.name}</span>
                                </div>
                                <button
                                    onClick={() => handleDeletePhase(phase.id)}
                                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                                    title="Delete phase"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}

                    <form onSubmit={handleAddPhase} className="flex gap-3 mt-4 pt-4 border-t border-gray-800">
                        <input
                            type="color"
                            value={newPhaseColor}
                            onChange={(e) => setNewPhaseColor(e.target.value)}
                            className="h-9 w-12 rounded cursor-pointer bg-transparent border-0 p-0"
                            title="Phase Color"
                        />
                        <input
                            type="text"
                            value={newPhaseName}
                            onChange={(e) => setNewPhaseName(e.target.value)}
                            placeholder="Phase name (e.g., Design)"
                            className="flex-1 bg-gray-950 border border-gray-800 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
                            required
                        />
                        <button
                            type="submit"
                            disabled={!newPhaseName.trim()}
                            className="px-4 py-1.5 bg-white text-black hover:bg-gray-200 disabled:opacity-50 font-medium text-sm rounded-md transition-colors flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" /> Add
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
