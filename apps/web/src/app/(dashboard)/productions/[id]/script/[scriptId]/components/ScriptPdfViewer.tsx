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
    url: string;        // kept for backwards-compat but not used; proxy URL is derived from ids
    scriptId: string;
    productionId: string;
    token: string;
}

/**
 * We serve the PDF through a server-side proxy route (/api/pdf/:productionId/:scriptId)
 * so that the browser never contacts R2 directly.  R2 doesn't set CORS headers,
 * which causes PDF.js to fail when it tries to fetch the presigned URL from the browser.
 *
 * The proxy route (apps/web/src/app/api/pdf/...) authenticates via the session cookie,
 * fetches a fresh presigned URL from the NestJS API, then streams the PDF bytes back
 * under our own origin — so PDF.js sees no CORS issue at all.
 *
 * A cache-busting query param is appended each time the user clicks "Refresh link"
 * so the browser re-fetches (bypassing any short-lived browser cache) without us
 * having to change the structural URL.
 */
export default function ScriptPdfViewer({ scriptId, productionId }: Props) {
    const proxyBase = `/api/pdf/${productionId}/${scriptId}`;
    const [url, setUrl] = useState(`${proxyBase}?v=${Date.now()}`);
    const [numPages, setNumPages] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.2);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const btnCls =
        'p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors';

    const refreshUrl = () => {
        setRefreshing(true);
        setError(false);
        setLoading(true);
        // Append a new cache-bust param so the browser re-fetches from the proxy
        setUrl(`${proxyBase}?v=${Date.now()}`);
        setRefreshing(false);
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
                            The file could not be retrieved from storage.
                        </p>
                        <button
                            onClick={refreshUrl}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing…' : 'Retry'}
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
