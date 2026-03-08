/**
 * Strips a user's watermark name from script text at render time.
 * Also strips PDF page-number markers such as "-- 1 of 120 --".
 * Raw text in the DB is never mutated — stripping is display-only.
 */
export function stripWatermark(
    text: string | null,
    watermarkName: string | null | undefined,
): string | null {
    if (!text) return text;

    // Always remove PDF page-number markers (e.g. "-- 1 of 120 --")
    let cleaned = text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '');
    // Collapse runs of 3+ newlines left behind by stripped markers
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    if (!watermarkName) return cleaned;
    const escaped = watermarkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return cleaned.replace(new RegExp(escaped, 'gi'), '');
}
