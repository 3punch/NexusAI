import { useEffect, useState } from "react";

import { apiFetch } from "../../../lib/api-client";
import { useAuthStore } from "../../../stores/auth-store";
import { authApi, type TokenResponse } from "../api/auth-api";

export type BootstrapStatus = "loading" | "ready";

/**
 * Restores the session on page load.
 *
 * After a reload the in-memory access token is gone — the httpOnly refresh
 * cookie is the only source of truth for "is this visitor still logged in?".
 * If refresh succeeds we mint a fresh access token and load /auth/me;
 * if not, the visitor is anonymous and /login awaits.
 */
export function useBootstrapAuth(): BootstrapStatus {
  const [status, setStatus] = useState<BootstrapStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const tokens = await apiFetch<TokenResponse>("/auth/refresh", {
          method: "POST",
          auth: false,
        });
        useAuthStore.getState().setAccessToken(tokens.access_token);
        const user = await authApi.me();
        if (!cancelled) {
          useAuthStore.getState().setSession(user, tokens.access_token);
        }
      } catch {
        // No valid refresh cookie — anonymous visitor, nothing to do.
      } finally {
        if (!cancelled) setStatus("ready");
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
