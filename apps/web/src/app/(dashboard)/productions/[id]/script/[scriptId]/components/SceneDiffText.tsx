'use client';

import { useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Token {
    text: string;
    type: 'same' | 'added' | 'removed';
}

// ─── Tokeniser ────────────────────────────────────────────────────────────────

// Split on whitespace boundaries, keeping the whitespace tokens so the text
// can be reconstructed exactly.
function tokenize(text: string): string[] {
    return text.split(/(\s+)/);
}

// ─── LCS diff ─────────────────────────────────────────────────────────────────

function diffTokens(oldTokens: string[], newTokens: string[]): Token[] {
    const m = oldTokens.length;
    const n = newTokens.length;

    // Build the LCS table
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
        new Array(n + 1).fill(0),
    );
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] =
                oldTokens[i - 1] === newTokens[j - 1]
                    ? dp[i - 1][j - 1] + 1
                    : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    // Backtrack from dp[m][n] to produce the diff, collecting in reverse
    const ops: Token[] = [];
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
            ops.push({ text: newTokens[j - 1], type: 'same' });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            ops.push({ text: newTokens[j - 1], type: 'added' });
            j--;
        } else {
            ops.push({ text: oldTokens[i - 1], type: 'removed' });
            i--;
        }
    }
    return ops.reverse();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SceneDiffText({
    newText,
    previousText,
    showDeletions,
}: {
    newText: string;
    previousText: string | null;
    showDeletions: boolean;
}) {
    const tokens: Token[] = useMemo(() => {
        if (!previousText) {
            // No prior version — treat every token as added (green)
            return tokenize(newText).map((t) => ({ text: t, type: 'added' as const }));
        }
        return diffTokens(tokenize(previousText), tokenize(newText));
    }, [newText, previousText]);

    return (
        <>
            {tokens.map((token, i) => {
                if (token.type === 'same') {
                    return <span key={i}>{token.text}</span>;
                }
                if (token.type === 'added') {
                    return (
                        <span
                            key={i}
                            style={{
                                backgroundColor: 'rgba(74, 222, 128, 0.18)',
                                color: '#4ade80',
                            }}
                        >
                            {token.text}
                        </span>
                    );
                }
                // removed — only render when deletions toggle is on
                if (!showDeletions) return null;
                return (
                    <span
                        key={i}
                        style={{
                            textDecoration: 'line-through',
                            color: '#f87171',
                            opacity: 0.75,
                        }}
                    >
                        {token.text}
                    </span>
                );
            })}
        </>
    );
}
