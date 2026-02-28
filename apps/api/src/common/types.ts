

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

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}
