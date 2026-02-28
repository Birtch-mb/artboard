'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { createApiClient } from '@/lib/api-client';
import { Upload, FileIcon, ImageIcon, ExternalLink, Trash2, X, ChevronLeft, ChevronRight, Save, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function FileGallery({
    files,
    fileCategory,
    locationId,
    productionId,
    canUpload,
    canDelete,
    token,
}: {
    files: any[];
    fileCategory: 'PICTURE' | 'DRAWING';
    locationId: string;
    productionId: string;
    canUpload: boolean;
    canDelete: boolean;
    token: string;
}) {
    const router = useRouter();
    // Always use the live session token so stale server-render props don't cause 401s
    const { data: sessionData } = useSession();
    const activeToken = (sessionData as any)?.accessToken ?? token;
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Lightbox state
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [currentNote, setCurrentNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    // Presigned URL map: fileId → URL string
    const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
    const [urlsLoading, setUrlsLoading] = useState(files.length > 0);

    // Fetch presigned URLs for all files on mount and whenever the file list changes
    useEffect(() => {
        if (files.length === 0) {
            setUrlsLoading(false);
            setImageUrls({});
            return;
        }

        setUrlsLoading(true);
        const client = createApiClient(activeToken);

        Promise.allSettled(
            files.map(async (file) => {
                const { url } = await client.get<{ url: string }>(
                    `/productions/${productionId}/locations/${locationId}/files/${file.id}/url`
                );
                return { id: file.id, url };
            })
        ).then((results) => {
            const map: Record<string, string> = {};
            results.forEach((result) => {
                if (result.status === 'fulfilled') {
                    map[result.value.id] = result.value.url;
                }
            });
            setImageUrls(map);
            setUrlsLoading(false);
        });
    }, [files, activeToken, productionId, locationId]);

    const handleUploadClick = () => {
        document.getElementById(`upload-${fileCategory}`)?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // reset input
        e.target.value = '';

        // Validations (25MB limit)
        if (file.size > 25 * 1024 * 1024) {
            alert('File size exceeds 25MB limit.');
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a JPG, PNG, WEBP, or PDF file.');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileType', fileCategory);

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/productions/${productionId}/locations/${locationId}/files`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${activeToken}`,
                },
                body: formData,
            });

            if (!res.ok) {
                // Session expired — sign out and redirect to login
                if (res.status === 401) {
                    await signOut({ redirect: false });
                    router.push('/login');
                    return;
                }
                const errBody = await res.json().catch(() => null);
                throw new Error(errBody?.message || `Upload failed (${res.status})`);
            }

            router.refresh(); // Refresh server component to get the new file in the list
        } catch (err: any) {
            alert(err.message || 'Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (fileId: string) => {
        if (!confirm('Are you sure you want to delete this file? This cannot be undone.')) return;
        setDeletingId(fileId);
        try {
            const client = createApiClient(activeToken);
            await client.delete(`/productions/${productionId}/locations/${locationId}/files/${fileId}`);
            router.refresh();
        } catch (err: any) {
            alert(err.message || 'Failed to delete file');
        } finally {
            setDeletingId(null);
        }
    };

    const handlePreview = (index: number) => {
        setSelectedIndex(index);
        setCurrentNote(files[index].notes || '');
        setIsEditingNote(false);
    };

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (selectedIndex !== null) {
            const nextIdx = (selectedIndex + 1) % files.length;
            setSelectedIndex(nextIdx);
            setCurrentNote(files[nextIdx].notes || '');
            setIsEditingNote(false);
        }
    }, [selectedIndex, files]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (selectedIndex !== null) {
            const prevIdx = (selectedIndex - 1 + files.length) % files.length;
            setSelectedIndex(prevIdx);
            setCurrentNote(files[prevIdx].notes || '');
            setIsEditingNote(false);
        }
    }, [selectedIndex, files]);

    const handleSaveNote = async () => {
        if (selectedIndex === null) return;
        const file = files[selectedIndex];
        setIsSavingNote(true);
        try {
            const client = createApiClient(activeToken);
            await client.patch(`/productions/${productionId}/locations/${locationId}/files/${file.id}`, {
                notes: currentNote.trim() || null
            });
            router.refresh();
            setIsEditingNote(false);
        } catch (err: any) {
            alert(err.message || 'Failed to save note');
        } finally {
            setIsSavingNote(false);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedIndex === null) return;
            if (e.key === 'Escape') setSelectedIndex(null);
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, handleNext, handlePrev]);

    return (
        <div className="flex flex-col gap-4">
            {canUpload && (
                <div className="flex justify-end">
                    <input
                        id={`upload-${fileCategory}`}
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                    <button
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="flex items-center gap-2 rounded-md bg-brand-primary/10 border border-brand-primary/30 px-3 py-1.5 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary/20 disabled:opacity-50"
                    >
                        {isUploading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
                        ) : (
                            <Upload className="h-4 w-4" />
                        )}
                        Upload {fileCategory === 'PICTURE' ? 'Photo' : 'Drawing'}
                    </button>
                </div>
            )}

            {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-neutral-500">
                    {fileCategory === 'PICTURE' ? (
                        <ImageIcon className="mb-2 h-8 w-8 opacity-50" />
                    ) : (
                        <FileIcon className="mb-2 h-8 w-8 opacity-50" />
                    )}
                    <p className="text-sm">No {fileCategory.toLowerCase()}s uploaded yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition-colors hover:border-neutral-700"
                        >
                            <div
                                className="relative flex aspect-square md:aspect-[4/3] w-full items-center justify-center bg-neutral-950 cursor-pointer overflow-hidden"
                                onClick={() => handlePreview(files.indexOf(file))}
                            >
                                {urlsLoading ? (
                                    <div className="h-full w-full animate-pulse bg-neutral-800" />
                                ) : imageUrls[file.id] ? (
                                    file.mimeType.includes('pdf') ? (
                                        <div className="relative h-full w-full overflow-hidden bg-white">
                                            <iframe
                                                src={`${imageUrls[file.id]}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                                                className="absolute inset-0 h-[150%] w-[150%] origin-top-left scale-[0.67] pointer-events-none border-none"
                                                title={file.filename}
                                                tabIndex={-1}
                                            />
                                            {/* Transparent overlay to capture clicks since iframe pointer-events-none */}
                                            <div className="absolute inset-0 bg-transparent z-10" />
                                        </div>
                                    ) : (
                                        <img
                                            src={imageUrls[file.id]}
                                            alt={file.filename}
                                            className="h-full w-full object-cover"
                                        />
                                    )
                                ) : (
                                    <div className="flex flex-col items-center gap-1 p-4">
                                        {file.mimeType.includes('pdf') ? (
                                            <FileIcon className="h-12 w-12 text-red-400 opacity-50" />
                                        ) : (
                                            <ImageIcon className="h-12 w-12 text-brand-primary opacity-50" />
                                        )}
                                        <span className="text-[10px] text-neutral-500">Preview unavailable</span>
                                    </div>
                                )}

                                {/* Hover overlay */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                    <ExternalLink className="h-6 w-6 text-white drop-shadow" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-neutral-800 p-3 bg-neutral-900 z-10">
                                <div className="flex flex-col truncate pr-2">
                                    <span className="truncate text-xs font-medium text-neutral-200" title={file.filename}>
                                        {file.filename}
                                    </span>
                                    <span className="text-[10px] text-neutral-500">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                </div>
                                {canDelete && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                                        disabled={deletingId === file.id}
                                        className="flex-shrink-0 rounded p-1.5 text-neutral-500 hover:bg-red-900/50 hover:text-red-400 transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            {selectedIndex !== null && files[selectedIndex] && (
                <div className="fixed inset-0 z-50 flex bg-black/95 backdrop-blur-sm">
                    {/* Top actions */}
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
                        {canDelete && (
                            <button
                                onClick={() => {
                                    const id = files[selectedIndex].id;
                                    setSelectedIndex(null);
                                    handleDelete(id);
                                }}
                                className="rounded-full bg-neutral-900/50 p-2 text-neutral-300 hover:bg-red-900/50 hover:text-red-400 transition-colors"
                                title="Delete image"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        )}
                        <button
                            onClick={() => setSelectedIndex(null)}
                            className="rounded-full bg-neutral-900/50 p-2 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                            title="Close preview"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Navigation Buttons */}
                    {files.length > 1 && (
                        <>
                            <button
                                onClick={handlePrev}
                                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors z-50 backdrop-blur-md"
                            >
                                <ChevronLeft className="h-8 w-8" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="absolute right-96 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors z-50 backdrop-blur-md"
                            >
                                <ChevronRight className="h-8 w-8" />
                            </button>
                        </>
                    )}

                    {/* Image / PDF Area */}
                    <div className="flex-1 flex items-center justify-center p-8 mr-80">
                        {files[selectedIndex].mimeType.includes('pdf') ? (
                            <iframe
                                src={`${imageUrls[files[selectedIndex].id] || ''}#view=FitH`}
                                title={files[selectedIndex].filename}
                                className="h-full w-full rounded shadow-2xl bg-white border-none"
                            />
                        ) : (
                            <img
                                src={imageUrls[files[selectedIndex].id] || ''}
                                alt={files[selectedIndex].filename}
                                className="max-h-full max-w-full object-contain drop-shadow-2xl"
                            />
                        )}
                    </div>

                    {/* Sidebar Area */}
                    <div className="w-80 bg-neutral-900 border-l border-neutral-800 flex flex-col pt-16 h-full flex-shrink-0">
                        <div className="p-6 flex flex-col h-full border-b border-neutral-800">
                            <h3 className="text-lg font-semibold text-white mb-1 truncate" title={files[selectedIndex].filename}>
                                {files[selectedIndex].filename}
                            </h3>
                            <p className="text-xs text-neutral-500 mb-6 font-mono">
                                {(files[selectedIndex].size / 1024 / 1024).toFixed(2)} MB
                            </p>

                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-neutral-300">Notes</h4>
                                {!isEditingNote && (
                                    <button
                                        onClick={() => setIsEditingNote(true)}
                                        className="text-neutral-500 hover:text-white transition-colors p-1 rounded hover:bg-neutral-800"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            {isEditingNote ? (
                                <div className="flex flex-col flex-1 gap-3">
                                    <textarea
                                        value={currentNote}
                                        onChange={(e) => setCurrentNote(e.target.value)}
                                        className="w-full flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-brand-primary outline-none resize-none leading-relaxed"
                                        placeholder="Add details about this photo..."
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setIsEditingNote(false);
                                                setCurrentNote(files[selectedIndex].notes || '');
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-800 rounded transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveNote}
                                            disabled={isSavingNote}
                                            className="flex items-center gap-1.5 bg-brand-primary text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
                                        >
                                            {isSavingNote ? (
                                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                                            ) : (
                                                <Save className="h-3.5 w-3.5" />
                                            )}
                                            Save Note
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto">
                                    {files[selectedIndex].notes ? (
                                        <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                                            {files[selectedIndex].notes}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-neutral-500 italic">No notes added.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
