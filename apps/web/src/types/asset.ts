export enum AssetCategory {
    PROPS = 'PROPS',
    SET_DRESSING = 'SET_DRESSING',
    GRAPHICS = 'GRAPHICS',
    FURNITURE = 'FURNITURE',
    VEHICLES = 'VEHICLES',
    EXPENDABLES = 'EXPENDABLES',
    SOFT_FURNISHINGS = 'SOFT_FURNISHINGS',
    GREENS = 'GREENS',
    WEAPONS = 'WEAPONS',
    FOOD = 'FOOD',
    ANIMALS = 'ANIMALS',
    SPECIAL_EFFECTS = 'SPECIAL_EFFECTS',
    OTHER = 'OTHER',
}

export enum AssetStatus {
    IN_SOURCING = 'IN_SOURCING',
    CONFIRMED = 'CONFIRMED',
    ON_SET = 'ON_SET',
    RETURNED = 'RETURNED',
    STRUCK = 'STRUCK',
}

export enum ContinuityState {
    PRESENT = 'PRESENT',
    ABSENT = 'ABSENT',
    MODIFIED = 'MODIFIED',
    HERO = 'HERO',
    DAMAGED = 'DAMAGED',
    DRESSED = 'DRESSED',
    STRUCK = 'STRUCK',
}

export interface AssetTag {
    id: string;
    name: string;
    productionId: string;
}

export interface AssetFileResponse {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
}

export interface AssetSetResponse {
    id: string;
    name: string;
    level: number;
    status: string;
}

export interface ContinuityEventResponse {
    id: string;
    sceneNumber: string;
    state: ContinuityState;
    notes?: string;
    createdAt: string;
}

export interface AssetResponse {
    id: string;
    productionId: string;
    name: string;
    category: AssetCategory;
    description?: string;
    notes?: string;
    dimensions?: string;
    quantity: number;
    budgetCost?: number | null;
    actualCost?: number | null;
    status: AssetStatus;

    tags: AssetTag[];
    sets: AssetSetResponse[];
    files?: AssetFileResponse[];
    continuityEvents?: ContinuityEventResponse[];
    _count?: {
        tags?: number;
        setAssignments?: number;
        files?: number;
        continuityEvents?: number;
    };
}
