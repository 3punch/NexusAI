/**
 * Auth API adapter. Components and hooks never build URLs themselves.
 * Note `auth: false` — login/register obviously cannot send a token.
 */

import { apiFetch } from "../../../lib/api-client";

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  display_name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  display_name: string;
}

export const authApi = {
  register: (payload: Registration) =>
    apiFetch<User>("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  login: (payload: Credentials) =>
    apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  me: () => apiFetch<User>("/auth/me"),
};
