import { type StateCreator } from "zustand";
import type { AuthState } from "../../types/auth";

const defaults = {
  pendingAuth: null,
  user: null,
};

export const authSlice: StateCreator<AuthState> = (set) => ({
  ...defaults,
  resetPendingAuth: () => set({ pendingAuth: null }),
  setPendingAuth: (pendingAuth) => set({ pendingAuth }),
  setUser: (user) => set({ user }),
  resetAuth: () => set(defaults),
});
