'use client';

import { useRef, useState, useCallback } from 'react';

export default function UserSettingsClient({
    initialShowDeletions,
    token,
}: {
    initialShowDeletions: boolean;
    token: string;
}) {
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

    const handleDeletionsChange = (next: boolean) => {
        setShowDeletions(next);
        patch({ showScriptDeletions: next }, 'Preference saved');
    };

    return (
        <div className="flex flex-col gap-8 max-w-lg">
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
