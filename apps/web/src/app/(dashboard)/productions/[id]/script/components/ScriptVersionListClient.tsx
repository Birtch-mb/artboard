'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, ChevronRight, Trash2 } from 'lucide-react';

const REVIEW_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    PENDING_REVIEW: { label: 'Pending Review', color: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
    IN_REVIEW: { label: 'In Review', color: 'bg-amber-900/50 text-amber-300 border-amber-800' },
    APPROVED: { label: 'Approved', color: 'bg-green-900/50 text-green-300 border-green-800' },
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function ScriptVersionListClient({
    initialScripts,
    productionId,
    canUpload,
    canReview,
    canDelete,
    token,
}: {
    initialScripts: any[];
    productionId: string;
    canUpload: boolean;
    canReview: boolean;
    canDelete: boolean;
    token: string;
}) {
    const router = useRouter();
    const [scripts, setScripts] = useState(initialScripts);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [versionLabel, setVersionLabel] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Watermark callout state — shown after first upload if not dismissed
    const [watermarkCallout, setWatermarkCallout] = useState<{ navigate: () => void } | null>(null);

    // Delete state
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    // Ref-based guard so a second click before React commits deleting=true can't slip through
    const deletingRef = useRef(false);

    const handleDelete = async () => {
        if (!deleteTarget || deletingRef.current) return;
        deletingRef.current = true;
        setDeleting(true);
        setDeleteError('');
        // Capture id now — don't rely on deleteTarget closure after the await
        const targetId = deleteTarget.id;
        try {
            const res = await fetch(`/api/proxy/productions/${productionId}/scripts/${targetId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Delete failed' }));
                throw new Error(err.message || 'Delete failed');
            }
            setScripts((prev) => prev.filter((s) => s.id !== targetId));
            setDeleteTarget(null);
        } catch (e: any) {
            setDeleteError(e.message || 'Delete failed');
        } finally {
            deletingRef.current = false;
            setDeleting(false);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !versionLabel.trim()) return;
        if (selectedFile.type !== 'application/pdf') {
            setUploadError('Only PDF files are allowed.');
            return;
        }
        if (selectedFile.size > 50 * 1024 * 1024) {
            setUploadError('File must be under 50MB.');
            return;
        }

        setUploading(true);
        setUploadError('');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('versionLabel', versionLabel.trim());

            const apiUrl = '/api/proxy';
            const res = await fetch(`${apiUrl}/productions/${productionId}/scripts`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Upload failed' }));
                throw new Error(err.message || 'Upload failed');
            }

            const newScript = await res.json();
            setShowUploadModal(false);
            setVersionLabel('');
            setSelectedFile(null);
            setScripts((prev) => [newScript, ...prev]);

            const navigateFn = () => {
                // First upload → launch wizard; subsequent uploads → breakdown view
                if (newScript.isFirstScript && !newScript.wizardComplete) {
                    router.push(`/productions/${productionId}/script/${newScript.id}/wizard`);
                } else {
                    router.push(`/productions/${productionId}/script/${newScript.id}`);
                }
            };

            // Show watermark callout on first upload if not already dismissed
            if (
                newScript.isFirstScript &&
                typeof localStorage !== 'undefined' &&
                localStorage.getItem('watermark-callout-dismissed') !== 'true'
            ) {
                setWatermarkCallout({ navigate: navigateFn });
            } else {
                navigateFn();
            }
        } catch (e: any) {
            setUploadError(e.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (e: React.MouseEvent, scriptId: string) => {
        e.stopPropagation();
        try {
            const apiUrl = '/api/proxy';
            const res = await fetch(`${apiUrl}/productions/${productionId}/scripts/${scriptId}/url`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            window.open(data.url, '_blank');
        } catch {
            // silent fail
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Header row with upload button */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-500">
                    {scripts.length === 0
                        ? 'No script versions uploaded yet.'
                        : `${scripts.length} version${scripts.length !== 1 ? 's' : ''}`}
                </p>
                {canUpload && (
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90"
                    >
                        <Upload className="h-4 w-4" />
                        Upload New Version
                    </button>
                )}
            </div>

            {/* Scripts list */}
            {scripts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 py-16 text-center">
                    <FileText className="h-10 w-10 text-neutral-600 mb-3" />
                    <p className="text-neutral-400 font-medium">No scripts yet</p>
                    <p className="text-sm text-neutral-600 mt-1">
                        Upload the first script version to get started.
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                    <table className="w-full text-left text-sm text-neutral-400">
                        <thead className="border-b border-neutral-800 bg-neutral-900/50 text-xs uppercase text-neutral-500">
                            <tr>
                                <th className="px-6 py-4 font-medium text-neutral-300">Version</th>
                                <th className="px-6 py-4 font-medium text-neutral-300 hidden sm:table-cell">Uploaded</th>
                                <th className="px-6 py-4 font-medium text-neutral-300 hidden md:table-cell">Uploaded By</th>
                                <th className="px-6 py-4 font-medium text-neutral-300">Status</th>
                                <th className="px-6 py-4 font-medium text-neutral-300 text-right">Scenes</th>
                                <th className="px-6 py-4 font-medium text-neutral-300 w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {scripts.map((script) => {
                                const statusStyle = REVIEW_STATUS_LABELS[script.reviewStatus] ?? REVIEW_STATUS_LABELS.PENDING_REVIEW;
                                return (
                                    <tr
                                        key={script.id}
                                        onClick={() => {
                                            const dest = script.isCurrent && !script.wizardComplete
                                                ? `/productions/${productionId}/script/${script.id}/wizard`
                                                : `/productions/${productionId}/script/${script.id}`;
                                            router.push(dest);
                                        }}
                                        className="group cursor-pointer transition-colors hover:bg-neutral-800/50"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-neutral-500 group-hover:text-neutral-300 transition-colors shrink-0" />
                                                <span className="font-medium text-neutral-200 group-hover:text-white transition-colors">
                                                    {script.versionLabel}
                                                </span>
                                                {script.isCurrent && (
                                                    <span className="inline-flex items-center rounded-full border border-brand-primary/40 bg-brand-primary/10 px-2 py-0.5 text-[10px] font-semibold text-brand-primary">
                                                        Current
                                                    </span>
                                                )}
                                                {!script.wizardComplete && (
                                                    <span className="inline-flex items-center rounded-full border border-amber-800/60 bg-amber-900/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                                        Breakdown in progress
                                                    </span>
                                                )}
                                                {script.unreviewedFlags > 0 && (
                                                    <span className="inline-flex items-center rounded-full border border-red-800/60 bg-red-900/20 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                                                        {script.unreviewedFlags} Unreviewed Changes
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell text-neutral-400">
                                            {formatDate(script.uploadedAt)}
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell text-neutral-400">
                                            {script.uploader?.name ?? script.uploader?.email ?? '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyle.color}`}>
                                                {statusStyle.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-neutral-400">
                                            {script._count?.scenes ?? 0}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {canDelete && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteError('');
                                                            setDeleteTarget({ id: script.id, label: script.versionLabel });
                                                        }}
                                                        className="rounded p-1 text-neutral-600 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete script"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                                <ChevronRight className="h-4 w-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
                        <h2 className="text-lg font-semibold text-white mb-4">Upload New Script Version</h2>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                                    Version Label <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={versionLabel}
                                    onChange={(e) => setVersionLabel(e.target.value)}
                                    placeholder="e.g. Draft 1, White Pages, Production Draft"
                                    maxLength={100}
                                    className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                                    PDF File <span className="text-red-400">*</span>
                                </label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-700 bg-neutral-900 p-6 cursor-pointer hover:border-neutral-600 transition-colors"
                                >
                                    {selectedFile ? (
                                        <div className="text-center">
                                            <FileText className="h-8 w-8 text-brand-primary mx-auto mb-2" />
                                            <p className="text-sm font-medium text-neutral-200">{selectedFile.name}</p>
                                            <p className="text-xs text-neutral-500 mt-1">
                                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <Upload className="h-8 w-8 text-neutral-500 mx-auto mb-2" />
                                            <p className="text-sm text-neutral-400">Click to select a PDF</p>
                                            <p className="text-xs text-neutral-600 mt-1">Max 50MB</p>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) setSelectedFile(f);
                                    }}
                                />
                            </div>

                            {uploadError && (
                                <p className="text-sm text-red-400">{uploadError}</p>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setVersionLabel('');
                                    setSelectedFile(null);
                                    setUploadError('');
                                }}
                                className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading || !selectedFile || !versionLabel.trim()}
                                className="flex-1 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? 'Uploading…' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 h-10 w-10 shrink-0">
                                <Trash2 className="h-5 w-5 text-red-400" />
                            </div>
                            <h2 className="text-base font-semibold text-white">Delete Script</h2>
                        </div>
                        <p className="text-sm text-neutral-400 mb-1">
                            Are you sure you want to delete{' '}
                            <span className="font-semibold text-neutral-200">{deleteTarget.label}</span>?
                        </p>
                        <p className="text-xs text-neutral-500 mb-5">
                            This will permanently delete the script and all of its scenes. This cannot be undone.
                        </p>
                        {deleteError && (
                            <p className="text-sm text-red-400 mb-3">{deleteError}</p>
                        )}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(null); setDeleteError(''); }}
                                disabled={deleting}
                                className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                                disabled={deleting}
                                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Watermark callout — shown after first upload, until dismissed */}
            {watermarkCallout && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm mx-4 rounded-xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl">
                        <h2 className="text-base font-semibold text-white mb-2">
                            Watermark filter
                        </h2>
                        <p className="text-sm text-neutral-400 mb-5">
                            Script PDFs often contain your name as a watermark. You can filter it
                            from scene text using the{' '}
                            <strong className="text-neutral-200">Watermark filter</strong> input in
                            the script breakdown toolbar.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    localStorage.setItem('watermark-callout-dismissed', 'true');
                                    setWatermarkCallout(null);
                                    watermarkCallout.navigate();
                                }}
                                className="flex-1 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
