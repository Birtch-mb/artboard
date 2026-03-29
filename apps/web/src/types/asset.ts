export enum AssetDepartment {
    PROPS = 'PROPS',
    GRAPHICS = 'GRAPHICS',
    SPFX = 'SPFX',
    SET_DEC = 'SET_DEC',
    CONSTRUCTION = 'CONSTRUCTION',
    PICTURE_CARS = 'PICTURE_CARS',
    OTHER = 'OTHER',
}

export enum AssetSubDepartment {
    GREENS = 'GREENS',
    MGFX = 'MGFX',
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
    department: AssetDepartment;
    subDepartment?: AssetSubDepartment | null;
    greenSpecies?: string | null;
    greenNursery?: string | null;
    greenNotes?: string | null;
    description?: string;
    notes?: string;
    dimensions?: string;
    quantity: number;
    budgetCost?: number | null;
    actualCost?: number | null;
    sourceVendor?: string | null;
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

export interface AssetListResponse {
    assets: AssetResponse[];
    departmentCounts: Record<AssetDepartment, number>;
    departmentStats?: {
        budgetTotals?: Record<string, number>;
        sourcingCounts: Record<string, number>;
    };
}
