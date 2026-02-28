'use client';

import { useState, useEffect } from 'react';
import { createApiClient } from '@/lib/api-client';
import { Loader2, Plus, GripVertical, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface GanttPhase {
    id: string;
    name: string;
    color: string;
    sortOrder: number;
}

interface SetPhase {
    id: string;
    setId: string;
    phaseId: string;
    startDate: string;
    endDate: string;
    notes: string | null;
    phase: GanttPhase;
}

interface ChildSet {
    id: string;
    name: string;
    level: number;
    ganttPhases: SetPhase[];
}

interface SetNode {
    id: string;
    name: string;
    level: number;
    ganttPhases: SetPhase[];
    children?: ChildSet[];
}

export function GanttView({
    productionId,
    canEdit,
    token,
}: {
    productionId: string;
    canEdit: boolean;
    token: string;
}) {
    const [sets, setSets] = useState<SetNode[]>([]);
    const [phases, setPhases] = useState<GanttPhase[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSets, setExpandedSets] = useState<Record<string, boolean>>({});

    const toggleExpand = (setId: string) => {
        setExpandedSets((prev) => ({ ...prev, [setId]: !prev[setId] }));
    };

    const client = createApiClient(token);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [fetchedPhases, fetchedSets] = await Promise.all([
                client.get(`/productions/${productionId}/gantt-phases`) as Promise<GanttPhase[]>,
                client.get(`/productions/${productionId}/sets?topLevelOnly=true`) as Promise<SetNode[]>,
            ]);
            setPhases(fetchedPhases || []);
            setSets(fetchedSets || []);
        } catch (err) {
            console.error('Failed to load Gantt data', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
            </div>
        );
    }

    // Determine date bounds
    let minDate = new Date();
    let maxDate = new Date();
    minDate.setDate(minDate.getDate() - 14);
    maxDate.setDate(maxDate.getDate() + 30);

    let hasPhases = false;
    sets.forEach((set) => {
        set.ganttPhases?.forEach((p) => {
            hasPhases = true;
            const start = new Date(p.startDate);
            const end = new Date(p.endDate);
            if (start < minDate) minDate = start;
            if (end > maxDate) maxDate = end;
        });
        set.children?.forEach((child) => {
            child.ganttPhases?.forEach((p) => {
                hasPhases = true;
                const start = new Date(p.startDate);
                const end = new Date(p.endDate);
                if (start < minDate) minDate = start;
                if (end > maxDate) maxDate = end;
            });
        });
    });

    const timeRange = maxDate.getTime() - minDate.getTime();
    const getLeftPercent = (dateStr: string) => {
        const time = new Date(dateStr).getTime() - minDate.getTime();
        return Math.max(0, Math.min(100, (time / timeRange) * 100));
    };
    const getWidthPercent = (startStr: string, endStr: string) => {
        const start = new Date(startStr).getTime();
        const end = Math.max(start + 86400000, new Date(endStr).getTime()); // at least 1 day duration
        const left = Math.max(0, Math.min(100, ((start - minDate.getTime()) / timeRange) * 100));
        const right = Math.max(0, Math.min(100, ((end - minDate.getTime()) / timeRange) * 100));
        return Math.max(0.5, right - left);
    };

    const renderTimelineRow = (node: SetNode | ChildSet, isChild: boolean = false, hasChildren: boolean = false) => {
        return (
            <div key={node.id} className="flex border-b border-neutral-800/50 hover:bg-neutral-800/30">
                <div className={`w-64 border-r border-neutral-800 shrink-0 px-4 py-3 flex items-center text-sm font-medium ${isChild ? 'text-neutral-400 pl-8' : 'text-neutral-200'}`}>
                    {!isChild && hasChildren && (
                        <button onClick={() => toggleExpand(node.id)} className="mr-2 text-neutral-500 hover:text-white transition-colors">
                            {expandedSets[node.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    )}
                    {!isChild && !hasChildren && <div className="w-6 shrink-0" />}
                    {node.name}
                </div>
                <div className="flex-1 relative min-h-[44px]">
                    {/* Grid lines could go here */}
                    {node.ganttPhases?.map((p) => (
                        <div
                            key={p.id}
                            className="absolute top-2 h-7 rounded shadow-sm flex items-center px-2 text-xs font-semibold whitespace-nowrap overflow-hidden text-white cursor-pointer hover:brightness-110 transition-all"
                            style={{
                                left: `${getLeftPercent(p.startDate)}%`,
                                width: `${getWidthPercent(p.startDate, p.endDate)}%`,
                                backgroundColor: p.phase.color,
                                minWidth: '24px'
                            }}
                            title={`${p.phase.name}\n${new Date(p.startDate).toLocaleDateString()} - ${new Date(p.endDate).toLocaleDateString()}`}
                        >
                            {p.phase.name}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 overflow-x-auto flex flex-col relative w-full h-full bg-neutral-900 overflow-y-auto outline-none">
            <div className="min-w-max flex-1 border-t border-neutral-800">
                {!hasPhases && sets.length === 0 ? (
                    <div className="p-8 text-neutral-500 text-sm text-center">
                        No sets with Gantt phases found.
                    </div>
                ) : (
                    <div className="flex flex-col pb-16">
                        <div className="flex border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10 shadow-sm">
                            <div className="w-64 border-r border-neutral-800 shrink-0 px-4 py-2 font-medium text-xs text-neutral-500 uppercase tracking-widest">
                                Set
                            </div>
                            <div className="flex-1 relative h-8">
                                {/* Minimal timeline markers */}
                                <div className="absolute left-0 text-xs text-neutral-500 top-2 ml-2">
                                    {minDate.toLocaleDateString()}
                                </div>
                                <div className="absolute right-0 text-xs text-neutral-500 top-2 mr-2">
                                    {maxDate.toLocaleDateString()}
                                </div>
                                <div className="absolute left-1/2 -translate-x-1/2 text-xs text-neutral-500 top-2">
                                    {new Date(minDate.getTime() + timeRange / 2).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        {sets.map(set => (
                            <div key={set.id} className="flex flex-col border-b border-neutral-800">
                                {renderTimelineRow(set, false, (set.children?.length ?? 0) > 0)}
                                {expandedSets[set.id] && set.children?.map(child => renderTimelineRow(child, true, false))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Legend */}
            {phases.length > 0 && (
                <div className="fixed bottom-6 right-6 bg-neutral-800 border border-neutral-700 p-3 rounded-lg shadow-xl flex gap-x-4 flex-wrap z-20">
                    {phases.map(p => (
                        <div key={p.id} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded text-white" style={{ backgroundColor: p.color }} />
                            <span className="text-xs text-neutral-300 font-medium">{p.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
