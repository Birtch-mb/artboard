'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Box, Download, X } from 'lucide-react';
import Link from 'next/link';
import { AssetDepartment, AssetSubDepartment } from '@/types/asset';

const DEPT_CONFIG: Record<string, { label: string; color: string }> = {
    PROPS:        { label: 'Props',          color: 'bg-blue-900/50 text-blue-300 border-blue-800' },
    SET_DEC:      { label: 'Set Dec',        color: 'bg-emerald-900/50 text-emerald-300 border-emerald-800' },
    GRAPHICS:     { label: 'Graphics',       color: 'bg-fuchsia-900/50 text-fuchsia-300 border-fuchsia-800' },
    SPFX:         { label: 'SPFX',           color: 'bg-orange-900/50 text-orange-300 border-orange-800' },
    CONSTRUCTION: { label: 'Construction',   color: 'bg-slate-700/50 text-slate-300 border-slate-600' },
    PICTURE_CARS: { label: 'Picture Cars',   color: 'bg-indigo-900/50 text-indigo-300 border-indigo-800' },
    OTHER:        { label: 'Other',          color: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
};

const SUBDEPT_CONFIG: Record<string, { label: string; color: string }> = {
    GREENS: { label: 'Greens', color: 'bg-lime-900/50 text-lime-300 border-lime-700' },
    MGFX:   { label: 'MGFX',   color: 'bg-violet-900/50 text-violet-300 border-violet-700' },
};

const DEPT_TAB_ORDER = ['ALL', 'PROPS', 'SET_DEC', 'GRAPHICS', 'SPFX', 'CONSTRUCTION', 'PICTURE_CARS', 'OTHER'] as const;

// Department → optional sub-departments available as a sub-filter
const SUBDEPT_FOR_DEPT: Record<string, AssetSubDepartment | null> = {
    SET_DEC:  AssetSubDepartment.GREENS,
    GRAPHICS: AssetSubDepartment.MGFX,
};

const ROLE_DEFAULT_DEPT: Record<string, string> = {
    PROPS_MASTER:        'PROPS',
    SET_DECORATOR:       'SET_DEC',
    LEADMAN:             'SET_DEC',
};

const ASSET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    IN_SOURCING: { label: 'Sourcing',  color: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
    CONFIRMED:   { label: 'Confirmed', color: 'bg-blue-900/50 text-blue-300 border-blue-800' },
    ON_SET:      { label: 'On Set',    color: 'bg-green-900/50 text-green-300 border-green-800' },
    RETURNED:    { label: 'Returned',  color: 'bg-yellow-900/50 text-yellow-300 border-yellow-800' },
    STRUCK:      { label: 'Struck',    color: 'bg-red-900/50 text-red-300 border-red-800' },
};

function exportCsv(assets: any[], departmentLabel: string, productionId: string) {
    const rows: string[][] = [
        ['Name', 'Department', 'Sub-Dept', 'Status', 'Tags', 'Sets', 'Budget', 'Actual', 'Vendor'],
    ];
    for (const asset of assets) {
        rows.push([
            asset.name,
            DEPT_CONFIG[asset.department]?.label ?? asset.department,
            asset.subDepartment ? (SUBDEPT_CONFIG[asset.subDepartment]?.label ?? asset.subDepartment) : '',
            asset.status.replace(/_/g, ' '),
            asset.tags.map((t: any) => t.name).join('; '),
            asset.sets.map((s: any) => s.name).join('; '),
            asset.budgetCost != null ? Number(asset.budgetCost).toFixed(2) : '',
            asset.actualCost != null ? Number(asset.actualCost).toFixed(2) : '',
            asset.sourceVendor ?? '',
        ]);
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assets_${departmentLabel.replace(/\s+/g, '_').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function AssetListClient({
    initialData,
    tags,
    sets,
    productionId,
    canSeeBudget,
    canCreate,
    canBulkReassign,
    userRole,
    token,
}: {
    initialData: { assets: any[]; departmentCounts: Record<string, number>; departmentStats?: any };
    tags: any[];
    sets: any[];
    productionId: string;
    canSeeBudget: boolean;
    canCreate: boolean;
    canBulkReassign: boolean;
    userRole?: string;
    token: string;
}) {
    const router = useRouter();

    const defaultDept = userRole ? (ROLE_DEFAULT_DEPT[userRole] ?? 'ALL') : 'ALL';

    const [assets, setAssets] = useState(initialData.assets);
    const [departmentCounts, setDepartmentCounts] = useState(initialData.departmentCounts);
    const [departmentStats] = useState(initialData.departmentStats);

    const [activeDept, setActiveDept] = useState<string>(defaultDept);
    const [subFilter, setSubFilter] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [setFilter, setSetFilter] = useState<string>('ALL');
    const [tagFilter, setTagFilter] = useState<string[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkTargetDept, setBulkTargetDept] = useState<string>('PROPS');
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

    const toggleTagFilter = (tagId: string) => {
        setTagFilter(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => setSelectedIds(new Set(filteredAssets.map((a: any) => a.id)));
    const clearSelection = () => setSelectedIds(new Set());

    // Switch dept tab — also clear sub-filter
    const switchDept = (dept: string) => {
        setActiveDept(dept);
        setSubFilter(null);
        setSelectedIds(new Set());
    };

    const updateStatus = async (assetId: string, newStatus: string) => {
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: newStatus } : a));
        try {
            await fetch(`/api/proxy/productions/${productionId}/assets/${assetId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus }),
            });
            router.refresh();
        } catch (e) {
            console.error(e);
        }
    };

    const handleBulkReassign = async () => {
        if (selectedIds.size === 0) return;
        setIsBulkSubmitting(true);
        try {
            await fetch(`/api/proxy/productions/${productionId}/assets/bulk`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ids: Array.from(selectedIds), department: bulkTargetDept }),
            });
            clearSelection();
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setIsBulkSubmitting(false);
        }
    };

    const filteredAssets = assets.filter((asset: any) => {
        if (activeDept !== 'ALL' && asset.department !== activeDept) return false;
        if (subFilter && asset.subDepartment !== subFilter) return false;
        if (search && !asset.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter !== 'ALL' && asset.status !== statusFilter) return false;
        if (setFilter !== 'ALL' && !asset.sets.some((s: any) => s.id === setFilter)) return false;
        if (tagFilter.length > 0 && !tagFilter.every(tagId => asset.tags.some((t: any) => t.id === tagId))) return false;
        return true;
    });

    const availableSubDept = activeDept !== 'ALL' ? SUBDEPT_FOR_DEPT[activeDept] : null;

    // Stats for current dept
    const deptKey = activeDept === 'ALL' ? null : activeDept;
    const statCount = deptKey ? (departmentCounts[deptKey] ?? 0) : assets.length;
    const statBudget = canSeeBudget && departmentStats?.budgetTotals
        ? (deptKey ? (departmentStats.budgetTotals[deptKey] ?? 0) : Object.values(departmentStats.budgetTotals).reduce((s: any, v: any) => s + v, 0))
        : null;
    const statSourcing = departmentStats?.sourcingCounts
        ? (deptKey ? (departmentStats.sourcingCounts[deptKey] ?? 0) : Object.values(departmentStats.sourcingCounts).reduce((s: any, v: any) => s + v, 0))
        : 0;

    const currentDeptLabel = activeDept === 'ALL' ? 'All' : (DEPT_CONFIG[activeDept]?.label ?? activeDept);

    return (
        <div className="flex flex-col gap-4">
            {/* Department tabs */}
            <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
                <div className="flex gap-1 min-w-max">
                    {DEPT_TAB_ORDER.map((dept) => {
                        const isAll = dept === 'ALL';
                        const count = isAll
                            ? Object.values(departmentCounts).reduce((s, v) => s + v, 0)
                            : (departmentCounts[dept] ?? 0);
                        const isActive = activeDept === dept;
                        return (
                            <button
                                key={dept}
                                onClick={() => switchDept(dept)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                                    isActive
                                        ? 'bg-neutral-700 text-white'
                                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                }`}
                            >
                                {isAll ? 'All' : DEPT_CONFIG[dept].label}
                                <span className={`ml-1.5 text-xs ${isActive ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                    ({count})
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Assets', value: String(statCount) },
                    { label: 'Sourcing', value: String(statSourcing) },
                    ...(statBudget !== null
                        ? [{ label: 'Budget', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(statBudget) }]
                        : []),
                ].map((stat) => (
                    <div key={stat.label} className="bg-neutral-800 rounded-lg px-4 py-3 border border-neutral-700">
                        <p className="text-xs text-neutral-500 mb-0.5">{stat.label}</p>
                        <p className="text-lg font-bold text-white tabular-nums">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Sub-dept filter pill */}
            {availableSubDept && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSubFilter(prev => prev === availableSubDept ? null : availableSubDept)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            subFilter === availableSubDept
                                ? SUBDEPT_CONFIG[availableSubDept].color
                                : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                        }`}
                    >
                        {SUBDEPT_CONFIG[availableSubDept].label} only
                    </button>
                    {subFilter && (
                        <button onClick={() => setSubFilter(null)} className="text-xs text-neutral-500 hover:text-white">
                            Show all {DEPT_CONFIG[activeDept]?.label}
                        </button>
                    )}
                </div>
            )}

            {/* Filters row */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative max-w-sm flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-10 pr-4 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-3 pr-8 text-sm text-neutral-200 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                    >
                        <option value="ALL">All Statuses</option>
                        {Object.keys(ASSET_STATUS_LABELS).map((key) => (
                            <option key={key} value={key}>{ASSET_STATUS_LABELS[key].label}</option>
                        ))}
                    </select>

                    <select
                        value={setFilter}
                        onChange={(e) => setSetFilter(e.target.value)}
                        className="rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-3 pr-8 text-sm text-neutral-200 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                    >
                        <option value="ALL">All Sets</option>
                        {sets.map((set) => (
                            <option key={set.id} value={set.id}>{set.name}</option>
                        ))}
                    </select>

                    <div className="ml-auto flex items-center gap-2">
                        {canCreate && (
                            <Link
                                href={`/productions/${productionId}/assets/new?dept=${activeDept !== 'ALL' ? activeDept : ''}`}
                                className="flex items-center gap-2 rounded-md bg-brand-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90"
                            >
                                + New Asset
                            </Link>
                        )}
                        <button
                            onClick={() => exportCsv(filteredAssets, currentDeptLabel, productionId)}
                            disabled={filteredAssets.length === 0}
                            className="flex items-center gap-1.5 rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={filteredAssets.length === 0 ? 'No assets to export' : 'Export CSV'}
                        >
                            <Download className="h-4 w-4" />
                            CSV
                        </button>
                    </div>
                </div>

                {/* Tags filter */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-neutral-500 m-1">Tags:</span>
                        {tags.map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => toggleTagFilter(tag.id)}
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                    tagFilter.includes(tag.id)
                                        ? 'border-brand-primary bg-brand-primary/20 text-brand-primary'
                                        : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                }`}
                            >
                                {tag.name}
                            </button>
                        ))}
                        {tagFilter.length > 0 && (
                            <button onClick={() => setTagFilter([])} className="text-xs text-neutral-500 hover:text-white ml-2 underline">Clear</button>
                        )}
                    </div>
                )}
            </div>

            {/* Asset table */}
            <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                <table className="w-full text-left text-sm text-neutral-400">
                    <thead className="border-b border-neutral-800 bg-neutral-900/50 text-xs uppercase text-neutral-500">
                        <tr>
                            {canBulkReassign && (
                                <th className="px-4 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size > 0 && selectedIds.size === filteredAssets.length}
                                        onChange={(e) => e.target.checked ? selectAll() : clearSelection()}
                                        className="rounded border-neutral-700 bg-neutral-800"
                                    />
                                </th>
                            )}
                            <th className="px-6 py-4 font-medium text-neutral-300">Asset</th>
                            <th className="px-6 py-4 font-medium text-neutral-300">Department</th>
                            <th className="px-6 py-4 font-medium text-neutral-300 hidden md:table-cell">Tags</th>
                            <th className="px-6 py-4 font-medium text-neutral-300 hidden sm:table-cell">Sets</th>
                            <th className="px-6 py-4 font-medium text-neutral-300">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {filteredAssets.length === 0 ? (
                            <tr>
                                <td colSpan={canBulkReassign ? 6 : 5} className="px-6 py-10 text-center">
                                    <p className="text-neutral-500">
                                        {activeDept === 'OTHER'
                                            ? 'No unassigned assets. Everything has a department.'
                                            : activeDept === 'ALL'
                                                ? 'No assets yet. Add the first one.'
                                                : `No ${currentDeptLabel} assets yet.`}
                                    </p>
                                    {canCreate && activeDept !== 'ALL' && (
                                        <Link
                                            href={`/productions/${productionId}/assets/new?dept=${activeDept}`}
                                            className="mt-2 inline-block text-sm text-brand-primary hover:underline"
                                        >
                                            Add a {currentDeptLabel} asset
                                        </Link>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            filteredAssets.map((asset: any) => {
                                const deptLabel = DEPT_CONFIG[asset.department];
                                const subLabel = asset.subDepartment ? SUBDEPT_CONFIG[asset.subDepartment] : null;
                                const statusLabel = ASSET_STATUS_LABELS[asset.status];
                                const visibleTags = asset.tags.slice(0, 3);
                                const hiddenTagsCount = asset.tags.length - 3;
                                const isSelected = selectedIds.has(asset.id);

                                return (
                                    <tr
                                        key={asset.id}
                                        className={`group transition-colors hover:bg-neutral-800/50 ${isSelected ? 'bg-neutral-800/30' : ''}`}
                                    >
                                        {canBulkReassign && (
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(asset.id)}
                                                    className="rounded border-neutral-700 bg-neutral-800"
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 cursor-pointer" onClick={() => router.push(`/productions/${productionId}/assets/${asset.id}`)}>
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400 group-hover:text-white transition-colors shrink-0">
                                                    <Box className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-neutral-200 group-hover:text-white transition-colors">
                                                        {asset.name}
                                                    </span>
                                                    {asset.quantity > 1 && (
                                                        <span className="text-xs text-neutral-500 mt-0.5">Qty: {asset.quantity}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 cursor-pointer" onClick={() => router.push(`/productions/${productionId}/assets/${asset.id}`)}>
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${deptLabel?.color || 'bg-neutral-800 text-neutral-400 border-neutral-700'}`}>
                                                    {deptLabel?.label || asset.department}
                                                </span>
                                                {subLabel && (
                                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${subLabel.color}`}>
                                                        {subLabel.label}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell cursor-pointer" onClick={() => router.push(`/productions/${productionId}/assets/${asset.id}`)}>
                                            <div className="flex flex-wrap gap-1">
                                                {visibleTags.map((tag: any) => (
                                                    <span key={tag.id} className="inline-flex rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-0.5 text-[10px] text-neutral-300 whitespace-nowrap">
                                                        {tag.name}
                                                    </span>
                                                ))}
                                                {hiddenTagsCount > 0 && (
                                                    <span className="inline-flex rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-500">
                                                        +{hiddenTagsCount}
                                                    </span>
                                                )}
                                                {asset.tags.length === 0 && <span className="text-neutral-600">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell text-neutral-300">
                                            {asset.sets?.length || 0}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={asset.status}
                                                onChange={(e) => updateStatus(asset.id, e.target.value)}
                                                className={`appearance-none bg-transparent outline-none cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-semibold pr-4 font-sans ${statusLabel?.color || 'text-neutral-400'}`}
                                            >
                                                {Object.entries(ASSET_STATUS_LABELS).map(([key, val]) => (
                                                    <option key={key} value={key} className="bg-neutral-900 text-white">{val.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Floating bulk action bar */}
            {canBulkReassign && selectedIds.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-t border-neutral-700 bg-neutral-800 px-6 py-4 shadow-2xl">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-white font-medium">{selectedIds.size} selected</span>
                        <button onClick={clearSelection} className="text-neutral-500 hover:text-white">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={bulkTargetDept}
                            onChange={(e) => setBulkTargetDept(e.target.value)}
                            className="rounded-md border border-neutral-600 bg-neutral-900 px-3 py-1.5 text-sm text-white focus:outline-none"
                        >
                            {Object.entries(DEPT_CONFIG).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleBulkReassign}
                            disabled={isBulkSubmitting}
                            className="rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
                        >
                            {isBulkSubmitting ? 'Reassigning...' : 'Reassign Department'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
