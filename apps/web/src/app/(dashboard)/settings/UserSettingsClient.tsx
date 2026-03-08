'use client';

import { useRef, useState, useCallback } from 'react';

export default function UserSettingsClient({
    initialWatermarkName,
    initialShowDeletions,
    token,
}: {
    initialWatermarkName: string | null;
    initialShowDeletions: boolean;
    token: string;
}) {
    const [watermarkName, setWatermarkName] = useState(initialWatermarkName ?? '');
    const [showDeletions, setShowDeletions] = useState(initialShowDeletions);
    const [feedback, setFeedback] = useState('');

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const patch = useCallback(
        (body: Record<string, unknown>, message: string) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                fetch('/api/proxy/users/me', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                })
                    .then((r) => { if (r.ok) setFeedback(message); })
                    .catch(() => { });
            }, 600);
        },
        [token],
    );

    const handleWatermarkChange = (value: string) => {
        setWatermarkName(value);
        patch({ watermarkName: value || null }, 'Watermark filter updated');
    };

    const handleDeletionsChange = (next: boolean) => {
        setShowDeletions(next);
        patch({ showScriptDeletions: next }, 'Preference saved');
    };

    return (
        <div className="flex flex-col gap-8 max-w-lg">
            {/* Watermark filter */}
            <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                    Watermark filter
                </label>
                <p className="text-xs text-neutral-500 mb-3">
                    Your name is often embedded in script PDFs as a watermark. Enter it here to have it
                    automatically stripped from scene text.
                </p>
                <input
                    type="text"
                    value={watermarkName}
                    onChange={(e) => handleWatermarkChange(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    maxLength={100}
                    className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                />
            </div>

            {/* Script deletions toggle */}
            <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                    Show deleted lines in script diff
                </label>
                <p className="text-xs text-neutral-500 mb-3">
                    When viewing a script version with changes, show struck-through text for lines that were
                    removed in the new version.
                </p>
                <button
                    onClick={() => handleDeletionsChange(!showDeletions)}
                    className="flex items-center gap-3"
                >
                    <span
                        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200"
                        style={{ backgroundColor: showDeletions ? '#ef4444' : '#1e293b' }}
                    >
                        <span
                            className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                            style={{ transform: `translateX(${showDeletions ? '22px' : '2px'})`, marginTop: '2px' }}
                        />
                    </span>
                    <span className="text-sm text-neutral-300">
                        {showDeletions ? 'Enabled' : 'Disabled'}
                    </span>
                </button>
            </div>

            {/* Inline feedback */}
            {feedback && (
                <p className="text-xs text-green-400">{feedback}</p>
            )}
        </div>
    );
}
