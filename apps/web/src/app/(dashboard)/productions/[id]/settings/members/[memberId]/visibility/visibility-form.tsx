'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createApiClient } from '@/lib/api-client';

interface Visibility {
  productionMemberId: string;
  showScript: boolean;
  showSchedule: boolean;
  showSets: boolean;
  showAssets: boolean;
  showLocations: boolean;
  showBudget: boolean;
}

const SECTIONS: Array<{ key: keyof Omit<Visibility, 'productionMemberId'>; label: string; description: string }> = [
  { key: 'showScript', label: 'Script', description: 'Access to script breakdowns and revisions' },
  { key: 'showSchedule', label: 'Schedule', description: 'Shooting schedule and calendar' },
  { key: 'showSets', label: 'Sets', description: 'Set list, drawings, and builds' },
  { key: 'showAssets', label: 'Assets', description: 'Props, set dressing, and graphics' },
  { key: 'showLocations', label: 'Locations', description: 'Location scouting and approvals' },
  { key: 'showBudget', label: 'Budget', description: 'Department budget and expenditure' },
];

export function VisibilityForm({
  productionId,
  memberId,
  token,
  initial,
}: {
  productionId: string;
  memberId: string;
  token: string;
  initial: Visibility;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Visibility>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function toggle(key: keyof Omit<Visibility, 'productionMemberId'>) {
    setValues((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const client = createApiClient(token);
      await client.patch(
        `/productions/${productionId}/members/${memberId}/visibility`,
        {
          showScript: values.showScript,
          showSchedule: values.showSchedule,
          showSets: values.showSets,
          showAssets: values.showAssets,
          showLocations: values.showLocations,
          showBudget: values.showBudget,
        },
      );
      setSaved(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <ul className="space-y-1 mb-6">
        {SECTIONS.map(({ key, label, description }) => (
          <li
            key={key}
            className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(key)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                values[key] ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  values[key] ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <span className="text-sm text-green-400">Saved</span>
        )}
      </div>
    </div>
  );
}
