import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "../stores/auth-store";
import { ApiError, apiFetch } from "./api-client";

const fetchMock = vi.fn();

describe("apiFetch 401 recovery", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    useAuthStore.getState().clear();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refreshes once and retries the original request after a 401", async () => {
    useAuthStore.getState().setAccessToken("expired-token");
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "expired" }), { status: 401 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "fresh-token" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1, title: "task" }]), { status: 200 }),
      );

    const result = await apiFetch<{ id: number; title: string }[]>(
      "/tasks?workspace_id=1",
    );

    expect(result).toEqual([{ id: 1, title: "task" }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(useAuthStore.getState().accessToken).toBe("fresh-token");
    const retryInit = fetchMock.mock.calls[2][1] as {
      headers: Record<string, string>;
    };
    expect(retryInit.headers.Authorization).toBe("Bearer fresh-token");
  });

  it("clears the session when the refresh also fails", async () => {
    useAuthStore.getState().setAccessToken("expired-token");
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "expired" }), { status: 401 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "invalid_refresh_token" }), {
          status: 401,
        }),
      );

    await expect(apiFetch("/tasks?workspace_id=1")).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
