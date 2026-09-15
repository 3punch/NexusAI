/**
 * The single HTTP doorway of the frontend.
 *
 * Every feature API module (features/<feature>/api) goes through apiFetch — no
 * component ever calls fetch() directly. That gives us exactly one place
 * with: base URL, auth header injection, error normalization, and the
 * 401 -> refresh -> retry recovery flow.
 */

import { useAuthStore } from "../stores/auth-store";

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Stable machine error codes → human copy. Unknown codes fall back to raw. */
const FRIENDLY_ERRORS: Record<string, string> = {
  not_a_workspace_member: "You don't have access to that workspace.",
  proposer_cannot_approve: "You can't approve your own action.",
  action_already_decided: "This action has already been decided.",
  notebooks_disabled: "Notebook execution is disabled on this deployment (available when running locally).",
};

export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return FRIENDLY_ERRORS[error.message] ?? error.message;
  }
  return String(error);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Attach the Bearer access token (default true). */
  auth?: boolean;
  /** Allow the automatic refresh-and-retry on 401 (default true). */
  retryOn401?: boolean;
}

/** Single-flight refresh: N concurrent 401s trigger exactly one /refresh. */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include", // sends the httpOnly refresh cookie
  })
    .then(async (response) => {
      if (!response.ok) return false;
      const data = (await response.json()) as { access_token: string };
      useAuthStore.getState().setAccessToken(data.access_token);
      return true;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, retryOn401 = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = useAuthStore.getState().accessToken;
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth && retryOn401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, retryOn401: false });
    }
    // Refresh failed: the session is over. Clear client state; the
    // protected route will redirect to /login.
    useAuthStore.getState().clear();
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const detail = (payload as { detail?: unknown } | null)?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
