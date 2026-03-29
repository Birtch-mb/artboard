
export enum ProductionStatus {
  PRE_PRODUCTION = 'PRE_PRODUCTION',
  ACTIVE = 'ACTIVE',
  WRAPPING = 'WRAPPING',
  WRAPPED = 'WRAPPED',
}

export enum Role {
  ART_DIRECTOR = 'ART_DIRECTOR',
  PRODUCTION_DESIGNER = 'PRODUCTION_DESIGNER',
  COORDINATOR = 'COORDINATOR',
  SET_DECORATOR = 'SET_DECORATOR',
  LEADMAN = 'LEADMAN',
  PROPS_MASTER = 'PROPS_MASTER',
  VIEWER = 'VIEWER',
}

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

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}
