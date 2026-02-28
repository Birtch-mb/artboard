import { ProductionStatus, Role } from './enums';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Production {
  id: string;
  name: string;
  status: ProductionStatus;
  startDate: Date | null;
  wrapDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionMember {
  id: string;
  productionId: string;
  userId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  coordinatorVisibility?: CoordinatorVisibility;
}

export interface CoordinatorVisibility {
  id: string;
  productionMemberId: string;
  showScript: boolean;
  showSchedule: boolean;
  showSets: boolean;
  showAssets: boolean;
  showLocations: boolean;
  showBudget: boolean;
  updatedAt: Date;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}
