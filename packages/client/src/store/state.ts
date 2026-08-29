import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { authSlice } from "./slices/auth";
import type { AuthState } from "../types/auth";

export type Store = AuthState & {
  hasHydrated: boolean;
  reset: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

const serverStorage: StateStorage = {
  getItem: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
};

export const useStore = create<Store>()(
  persist(
    (set, get, store) => ({
      ...authSlice(set, get, store),
      hasHydrated: false,
      reset: () => set({ pendingAuth: null, user: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "repin-client",
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      partialize: (state) => ({
        pendingAuth: state.pendingAuth,
        user: state.user,
      }),
      skipHydration: true,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? serverStorage : sessionStorage,
      ),
    },
  ),
);
