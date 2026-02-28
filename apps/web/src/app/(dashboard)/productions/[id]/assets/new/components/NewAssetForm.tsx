'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createApiClient } from '@/lib/api-client';

const ASSET_CATEGORIES = [
    'PROPS', 'SET_DRESSING', 'GRAPHICS', 'FURNITURE', 'VEHICLES',
    'EXPENDABLES', 'SOFT_FURNISHINGS', 'GREENS', 'WEAPONS',
    'FOOD', 'ANIMALS', 'SPECIAL_EFFECTS', 'OTHER'
];

const ASSET_STATUSES = [
    'IN_SOURCING', 'CONFIRMED', 'ON_SET', 'RETURNED', 'STRUCK'
];

export default function NewAssetForm({
    productionId,
    token,
    tags,
    sets,
    canSeeBudget
}: {
    productionId: string;
    token: string;
    tags: any[];
    sets: any[];
    canSeeBudget: boolean;
}) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        category: 'PROPS',
        status: 'IN_SOURCING',
        description: '',
        notes: '',
        dimensions: '',
        quantity: 1,
        budgetCost: '',
        actualCost: '',
        sourceVendor: '',
    });

    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);

    const toggleTag = (id: string) => {
        setSelectedTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const toggleSet = (id: string) => {
        setSelectedSetIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const client = createApiClient(token);

            const payload: any = {
                name: formData.name,
                category: formData.category,
                status: formData.status,
                description: formData.description || undefined,
                notes: formData.notes || undefined,
                dimensions: formData.dimensions || undefined,
                quantity: formData.quantity,
                tagIds: selectedTagIds,
                setIds: selectedSetIds,
            };

            if (canSeeBudget) {
                if (formData.budgetCost) payload.budgetCost = parseFloat(formData.budgetCost);
                if (formData.actualCost) payload.actualCost = parseFloat(formData.actualCost);
                if (formData.sourceVendor) payload.sourceVendor = formData.sourceVendor;
            }

            const asset: any = await client.post(`/productions/${productionId}/assets`, payload);

            router.push(`/productions/${productionId}/assets/${asset.id}`);
            router.refresh(); // ensure list updates
        } catch (err: any) {
            setError(err.message || 'Failed to create asset');
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {error && (
                <div className="rounded-md bg-red-900/50 p-4 border border-red-800 text-sm text-red-400 font-medium">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-300">Name *</label>
                    <input
                        required
                        maxLength={200}
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        placeholder="e.g. Vintage Leather Sofa"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-300">Quantity</label>
                    <input
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-300">Category *</label>
                    <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    >
                        {ASSET_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-300">Status</label>
                    <select
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    >
                        {ASSET_STATUSES.map(stat => (
                            <option key={stat} value={stat}>{stat.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-sm font-medium text-neutral-300">Description</label>
                    <textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="min-h-[80px] rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        placeholder="Provide a detailed description of the asset..."
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-300">Dimensions</label>
                    <input
                        value={formData.dimensions}
                        onChange={e => setFormData({ ...formData, dimensions: e.target.value })}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        placeholder="e.g. 72 x 36 x 34 inches"
                    />
                </div>

                {canSeeBudget && (
                    <>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-emerald-400">Budget Cost</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.budgetCost}
                                onChange={e => setFormData({ ...formData, budgetCost: e.target.value })}
                                className="rounded-md border border-emerald-800/50 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-emerald-400">Actual Cost</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.actualCost}
                                onChange={e => setFormData({ ...formData, actualCost: e.target.value })}
                                className="rounded-md border border-emerald-800/50 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-emerald-400">Source / Vendor</label>
                            <input
                                type="text"
                                value={formData.sourceVendor}
                                onChange={e => setFormData({ ...formData, sourceVendor: e.target.value })}
                                className="rounded-md border border-emerald-800/50 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                placeholder="e.g. IKEA, Prop House LA"
                            />
                        </div>
                    </>
                )}
            </div>

            <div className="border-t border-neutral-800 pt-6">
                <h3 className="text-sm font-medium text-white mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag: any) => (
                        <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selectedTagIds.includes(tag.id)
                                    ? 'border-brand-primary bg-brand-primary/20 text-brand-primary'
                                    : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                }`}
                        >
                            {tag.name}
                        </button>
                    ))}
                    {tags.length === 0 && <p className="text-xs text-neutral-500">No tags found. Add them in settings or detail views.</p>}
                </div>
            </div>

            <div className="border-t border-neutral-800 pt-6">
                <h3 className="text-sm font-medium text-white mb-4">Assign Sets</h3>
                <div className="flex flex-wrap gap-2">
                    {sets.map((set: any) => (
                        <button
                            key={set.id}
                            type="button"
                            onClick={() => toggleSet(set.id)}
                            className={`inline-flex rounded border px-3 py-1.5 text-xs font-medium transition-colors ${selectedSetIds.includes(set.id)
                                    ? 'border-brand-primary bg-brand-primary/20 text-brand-primary'
                                    : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                }`}
                        >
                            {set.name}
                        </button>
                    ))}
                    {sets.length === 0 && <p className="text-xs text-neutral-500">No sets created yet. You can assign sets later.</p>}
                </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-neutral-800 pt-6">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-md px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-brand-primary px-6 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? 'Creating...' : 'Create Asset'}
                </button>
            </div>
        </form>
    );
}
