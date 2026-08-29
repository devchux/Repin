export type AuthUser = {
  id: number;
  email: string;
  firstName?: string;
  isSuper?: boolean;
  lastName?: string;
};

export type AuthMode = "login" | "register";

export type PendingAuth = {
  email: string;
  firstName?: string;
  lastName?: string;
  mockCode?: string;
  mode: AuthMode;
};

export type AuthState = {
  pendingAuth: PendingAuth | null;
  user: AuthUser | null;
  resetPendingAuth: () => void;
  setPendingAuth: (pendingAuth: PendingAuth) => void;
  setUser: (user: AuthUser) => void;
  resetAuth: () => void;
};
