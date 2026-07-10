import { Request } from 'express';

export enum AuthCodePurpose {
  LOGIN = 'login',
  REGISTER = 'register',
}

export type AuthUser = {
  id: number;
  email: string;
  isSuper: boolean;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};

export type RefreshTokenPayload = AuthUser & {
  sessionId: string;
};

export type StoredAuthCode = {
  codeHash: string;
  purpose: AuthCodePurpose;
};

export type RefreshSession = {
  userId: number;
  tokenHash: string;
};
