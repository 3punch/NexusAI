/**
 * Client-only global state.
 *
 * The access token lives in MEMORY ONLY — never localStorage. A page refresh
 * clears it, and the httpOnly refresh cookie is what actually keeps you
 * logged in. Rationale: XSS can execute with whatever it can steal, but it
 * cannot read an httpOnly cookie. Server data is NOT state you own — that
 * belongs to TanStack Query, not here.
 *
 * What belongs in stores/: session identity, UI preferences, draft state.
 * What never belongs in stores/: cached API responses.
 */

import { create } from "zustand";

export interface User {
  id: number;
  email: string;
  display_name: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setSession: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () => set({ user: null, accessToken: null }),
}));
