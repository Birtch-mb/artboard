/**
 * Strips a user's watermark name from script text at render time.
 * Raw text in the DB is never mutated — stripping is display-only.
 */
export function stripWatermark(
    text: string | null,
    watermarkName: string | null | undefined,
): string | null {
    if (!text || !watermarkName) return text;
    const escaped = watermarkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(escaped, 'gi'), '');
}
