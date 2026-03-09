'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Loader2,
    RefreshCw,
} from 'lucide-react';

// pdfjs-dist v3 uses .js (not .mjs)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface Props {
    url: string;
    scriptId: string;
    productionId: string;
    token: string;
}

export default function ScriptPdfViewer({ url: initialUrl, scriptId, productionId, token }: Props) {
    const [url, setUrl] = useState(initialUrl);
    const [numPages, setNumPages] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.2);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const btnCls =
        'p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors';

    const refreshUrl = async () => {
        setRefreshing(true);
        try {
            const res = await fetch(
                `/api/proxy/productions/${productionId}/scripts/${scriptId}/url`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (res.ok) {
                const data = await res.json();
                setUrl(data.url);
                setError(false);
                setLoading(true);
            }
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-neutral-950">
            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between gap-4 px-3 py-2 border-b border-neutral-800 bg-neutral-900/80 shrink-0">
                {/* Page navigation */}
                <div className="flex items-center gap-1">
                    <button
                        className={btnCls}
                        onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                        disabled={pageNumber <= 1}
                        title="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    <span className="text-xs text-neutral-400 tabular-nums select-none w-[4.5rem] text-center">
                        {loading ? '— / —' : `${pageNumber} / ${numPages}`}
                    </span>

                    <button
                        className={btnCls}
                        onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                        disabled={pageNumber >= numPages || loading}
                        title="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-1">
                    <button
                        className={btnCls}
                        onClick={() => setScale((s) => Math.max(0.5, parseFloat((s - 0.15).toFixed(2))))}
                        title="Zoom out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>

                    <span className="text-xs text-neutral-400 tabular-nums select-none w-9 text-center">
                        {Math.round(scale * 100)}%
                    </span>

                    <button
                        className={btnCls}
                        onClick={() => setScale((s) => Math.min(3.0, parseFloat((s + 0.15).toFixed(2))))}
                        title="Zoom in"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => setScale(1.2)}
                        className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors px-2 py-1 rounded hover:bg-neutral-700"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* ── PDF canvas area ── */}
            <div className="flex-1 overflow-auto flex justify-center py-6 px-4">
                {error ? (
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <p className="text-sm text-red-400 font-medium">Failed to load PDF</p>
                        <p className="text-xs text-neutral-500">
                            The link may have expired.
                        </p>
                        <button
                            onClick={refreshUrl}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing…' : 'Refresh link'}
                        </button>
                    </div>
                ) : (
                    <>
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 text-neutral-500 animate-spin" />
                            </div>
                        )}
                        <Document
                            file={url}
                            onLoadSuccess={({ numPages }) => {
                                setNumPages(numPages);
                                setLoading(false);
                            }}
                            onLoadError={() => {
                                setError(true);
                                setLoading(false);
                            }}
                            loading={null}
                        >
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                renderTextLayer
                                renderAnnotationLayer={false}
                                className="shadow-2xl rounded"
                            />
                        </Document>
                    </>
                )}
            </div>
        </div>
    );
}
