import { Injectable, Logger } from '@nestjs/common';
import { IntExt, TimeOfDay } from '@prisma/client';

// pdf-parse v2.x exports a PDFParse class; LoadParameters.data accepts Buffer/Uint8Array
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as {
    PDFParse: new (options: {
        data: Uint8Array | Buffer;
        verbosity?: number;
    }) => {
        getText(params?: Record<string, unknown>): Promise<{ text: string }>;
        destroy(): Promise<void>;
    };
};

export interface ParsedScene {
    sceneNumber: string;
    intExt: IntExt;
    scriptedLocationName: string;
    timeOfDay: TimeOfDay;
    sceneText: string;
    characters: string[];
}

// Matches standard US screenplay scene headings:
//   [optional num]  INT./EXT./INT./EXT.  LOCATION  -  TIME OF DAY  [optional num]
// Allows up to 3 letters after the scene number (e.g. 50A, 50AB, 50ABC)
const HEADING_RE =
    /^(?:\d+[A-Z]{0,3}\s+)?(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?|I\/E\.?)\s+(.+?)\s*[-–—]\s*(.+?)(?:\s+\d+[A-Z]{0,3}\.?\s*)?$/i;

// Lines that are only a page number, CONTINUED, or script header/footer noise
const NOISE_RE = /^(\d+\.?|CONTINUED:?|CONT'D\.?|FADE IN:|FADE OUT\.|THE END\.?)$/i;

// ALL-CAPS transition/direction lines that are not character names
const TRANSITION_RE = /^(CUT TO:|SMASH CUT|MATCH CUT|HARD CUT|JUMP CUT|BACK TO:|INTERCUT|INTERCUT WITH|FLASHBACK|END FLASHBACK|FLASH CUT|FREEZE FRAME|TIME CUT|DISSOLVE TO:|IRIS IN:|IRIS OUT:|WIPE TO:|SUPER:|TITLE:|INTERTITLE:|OMITTED|CONTINUED)\.?:?$/i;

// A standalone scene-number token on its own line (e.g. "50A", "50A.")
// Pure digit lines ("50") are already removed by NOISE_RE above.
// These appear in professional PDFs where the number is printed in the margin
// column separately from the heading text.
const SCENE_NUM_ONLY_RE = /^(\d+[A-Z]{1,3}\.?)$/i;

const TIME_OF_DAY_MAP: Record<string, TimeOfDay> = {
    DAY: TimeOfDay.DAY,
    NIGHT: TimeOfDay.NIGHT,
    DAWN: TimeOfDay.DAWN,
    DUSK: TimeOfDay.DUSK,
    CONTINUOUS: TimeOfDay.CONTINUOUS,
    LATER: TimeOfDay.LATER,
    'MOMENTS LATER': TimeOfDay.MOMENTS_LATER,
    // common aliases
    MORNING: TimeOfDay.DAY,
    AFTERNOON: TimeOfDay.DAY,
    EVENING: TimeOfDay.NIGHT,
    SUNSET: TimeOfDay.DUSK,
    SUNRISE: TimeOfDay.DAWN,
    MAGIC: TimeOfDay.DUSK,
    'MAGIC HOUR': TimeOfDay.DUSK,
};

@Injectable()
export class ScreenplayParserService {
    private readonly logger = new Logger(ScreenplayParserService.name);

    async parse(buffer: Buffer): Promise<ParsedScene[]> {
        const parser = new PDFParse({ data: buffer, verbosity: 0 });
        try {
            const result = await parser.getText();
            const preview = result.text.slice(0, 1000).replace(/\n/g, '↵');
            this.logger.debug(`PDF raw text preview (first 1000 chars): ${preview}`);
            const scenes = this.parseText(result.text);
            this.logger.debug(`Parsed ${scenes.length} scenes`);
            return scenes;
        } catch (err: any) {
            this.logger.warn(`PDF parse failed, scenes will not be auto-created: ${err.message}`);
            return [];
        } finally {
            await parser.destroy().catch(() => {/* ignore cleanup errors */});
        }
    }

    private parseText(rawText: string): ParsedScene[] {
        const lines = rawText
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0 && !NOISE_RE.test(l));

        const scenes: ParsedScene[] = [];
        let fallbackNum = 0;
        let currentHeading: Omit<ParsedScene, 'sceneText' | 'characters'> | null = null;
        let bodyLines: string[] = [];

        // Tracks a scene number seen on its own line (margin-column format in many PDFs).
        // When the very next heading has no inline number prefix, we use this instead
        // of the fallback counter. Inline numbers on the heading line always take priority.
        let pendingSceneNum: string | null = null;

        const flushScene = () => {
            if (!currentHeading) return;
            scenes.push({
                ...currentHeading,
                sceneText: bodyLines.join('\n').trim(),
                characters: this.extractCharacters(bodyLines),
            });
            bodyLines = [];
        };

        for (const line of lines) {
            if (this.isSceneHeading(line)) {
                flushScene();
                fallbackNum++;
                currentHeading = this.parseHeading(line, fallbackNum, pendingSceneNum);
                pendingSceneNum = null; // consumed
            } else if (SCENE_NUM_ONLY_RE.test(line)) {
                // Margin scene-number token (e.g. "50A").
                // Could be the left-margin number before the next heading, or the
                // right-margin duplicate after the previous heading. Either way,
                // store it as pending and do NOT add it to the scene body text.
                pendingSceneNum = line.replace(/\.$/, '').toUpperCase();
            } else if (currentHeading) {
                bodyLines.push(line);
            }
            // Lines before the first heading are title page / preamble — skip them
        }

        flushScene();

        // Deduplicate by sceneNumber — keep first occurrence
        const seen = new Set<string>();
        return scenes.filter((s) => {
            if (seen.has(s.sceneNumber)) return false;
            seen.add(s.sceneNumber);
            return true;
        });
    }

    private isSceneHeading(line: string): boolean {
        return HEADING_RE.test(line);
    }

    private parseHeading(
        line: string,
        fallbackNum: number,
        pendingSceneNum: string | null,
    ): Omit<ParsedScene, 'sceneText' | 'characters'> {
        const match = line.match(HEADING_RE);
        if (!match) {
            return {
                sceneNumber: pendingSceneNum ?? String(fallbackNum),
                intExt: IntExt.INT,
                scriptedLocationName: line.slice(0, 500),
                timeOfDay: TimeOfDay.DAY,
            };
        }

        const [, intExtRaw, locationRaw, timeRaw] = match;

        // Priority order for scene number:
        //   1. Inline prefix on this heading line (e.g. "50A INT. LIVING ROOM - NIGHT")
        //   2. Pending margin-column token from the line immediately before this heading
        //   3. Auto-incrementing fallback counter
        const inlineMatch = line.match(/^(\d+[A-Z]{0,3})\s+/i);
        const sceneNumber = inlineMatch
            ? inlineMatch[1].replace(/\.$/, '').toUpperCase()
            : pendingSceneNum ?? String(fallbackNum);

        // Clean time of day: strip trailing scene-number noise (e.g. "NIGHT 50A")
        const cleanTime = timeRaw
            .trim()
            .toUpperCase()
            .replace(/\s*\d+[A-Z]{0,3}\.?\s*$/, '')
            .trim();

        return {
            sceneNumber,
            intExt: this.mapIntExt(intExtRaw),
            scriptedLocationName: locationRaw.trim().slice(0, 500),
            timeOfDay: this.mapTimeOfDay(cleanTime),
        };
    }

    private mapIntExt(raw: string): IntExt {
        const norm = raw.toUpperCase().replace(/\./g, '');
        if (norm.includes('/')) return IntExt.INT_EXT;
        if (norm === 'EXT') return IntExt.EXT;
        return IntExt.INT;
    }

    private mapTimeOfDay(raw: string): TimeOfDay {
        // Exact match first
        if (TIME_OF_DAY_MAP[raw]) return TIME_OF_DAY_MAP[raw];

        // Partial match for things like "DAY - FLASHBACK" → DAY
        for (const key of Object.keys(TIME_OF_DAY_MAP)) {
            if (raw.startsWith(key)) return TIME_OF_DAY_MAP[key];
        }

        return TimeOfDay.DAY;
    }

    /**
     * Extract character names from scene body lines.
     * In standard US screenplay format, character names are:
     *   - Short ALL-CAPS words (1–4 words, ≤ 40 chars)
     *   - May be followed by (V.O.), (O.S.), (CONT'D), etc.
     *   - Not scene headings, noise lines, or transition directions
     */
    private extractCharacters(lines: string[]): string[] {
        const chars = new Set<string>();

        for (const line of lines) {
            // Strip trailing parenthetical qualifiers: (V.O.), (O.S.), (CONT'D)
            const stripped = line.replace(/\s*\([^)]*\)\s*$/, '').trim();

            // Must be 2–40 chars
            if (stripped.length < 2 || stripped.length > 40) continue;

            // Must be ALL CAPS (letters, spaces, hyphens, apostrophes only)
            if (stripped !== stripped.toUpperCase()) continue;
            if (!/^[A-Z][A-Z\s\-'.]*$/.test(stripped)) continue;

            // Must contain at least 2 letters, no digits
            if ((stripped.match(/[A-Z]/g) ?? []).length < 2) continue;
            if (/\d/.test(stripped)) continue;

            // Skip scene headings and noise
            if (HEADING_RE.test(stripped)) continue;
            if (NOISE_RE.test(stripped)) continue;
            if (TRANSITION_RE.test(stripped)) continue;

            chars.add(stripped);
        }

        return Array.from(chars).sort();
    }
}
