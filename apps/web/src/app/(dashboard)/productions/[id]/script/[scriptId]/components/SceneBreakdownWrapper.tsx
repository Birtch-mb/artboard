'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronLeft, BookOpen, X } from 'lucide-react';
import SceneBreakdownClient from './SceneBreakdownClient';

// Dynamically import the PDF viewer (client-only — pdfjs uses browser APIs)
const ScriptPdfViewer = dynamic(() => import('./ScriptPdfViewer'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-neutral-950">
            <p className="text-sm text-neutral-500">Loading viewer…</p>
        </div>
    ),
});

interface Props {
    script: any;
    scenes: any[];
    pdfUrl: string;
    productionId: string;
    sets: any[];
    assets: any[];
    productionCharacters: any[];
    canEdit: boolean;
    canReview: boolean;
    canAssignAsset: boolean;
    token: string;
    showScriptDeletions: boolean;
    initialWatermarkName: string | null;
}

export default function SceneBreakdownWrapper({
    script,
    scenes,
    pdfUrl,
    productionId,
    sets,
    assets,
    productionCharacters,
    canEdit,
    canReview,
    canAssignAsset,
    token,
    showScriptDeletions,
    initialWatermarkName,
}: Props) {
    const [showPdf, setShowPdf] = useState(false);

    const sceneBreakdown = (
        <SceneBreakdownClient
            initialScenes={scenes}
            scriptId={script.id}
            productionId={productionId}
            sets={sets}
            assets={assets}
            productionCharacters={productionCharacters}
            canEdit={canEdit}
            canReview={canReview}
            canAssignAsset={canAssignAsset}
            token={token}
            showScriptDeletions={showScriptDeletions}
            initialWatermarkName={initialWatermarkName}
        />
    );

    // ── Split pane ─────────────────────────────────────────────────────────────
    if (showPdf) {
        return (
            // Fill the full content area height (viewport minus the 53px top nav)
            <div className="flex h-[calc(100vh-53px)] overflow-hidden">

                {/* ── Left: PDF viewer ── */}
                <div className="flex flex-col w-[46%] min-w-[360px] max-w-[680px] border-r border-neutral-800 shrink-0">
                    {/* Panel header */}
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-neutral-800 bg-neutral-900 shrink-0">
                        <span className="text-sm font-medium text-neutral-200 truncate">
                            {script?.versionLabel}
                        </span>
                        <button
                            onClick={() => setShowPdf(false)}
                            className="flex items-center gap-1.5 shrink-0 text-xs text-neutral-500 hover:text-white border border-neutral-700 rounded px-2 py-1 hover:bg-neutral-800 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                            Close
                        </button>
                    </div>
                    <ScriptPdfViewer url={pdfUrl} />
                </div>

                {/* ── Right: Scene breakdown ── */}
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col gap-4 p-6">
                        <Link
                            href={`/productions/${productionId}/script`}
                            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors w-fit"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            All Versions
                        </Link>

                        <div className="border-b border-neutral-800 pb-4">
                            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                                {script?.versionLabel}
                            </h1>
                            <p className="text-sm text-neutral-500">
                                Scene breakdown — {scenes.length} scene{scenes.length !== 1 ? 's' : ''}
                            </p>
                        </div>

                        {sceneBreakdown}
                    </div>
                </div>
            </div>
        );
    }

    // ── Normal (single-pane) layout ────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-4">
            {/* Header row */}
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                        {script?.versionLabel}
                    </h1>
                    <p className="text-sm text-neutral-500">
                        Scene breakdown — {scenes.length} scene{scenes.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <button
                    onClick={() => setShowPdf(true)}
                    className="flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors shrink-0"
                >
                    <BookOpen className="h-4 w-4" />
                    View Script
                </button>
            </div>

            {sceneBreakdown}
        </div>
    );
}
