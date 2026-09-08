import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../../../stores/auth-store";
import { authApi, type Credentials } from "../api/auth-api";

export function useLogin() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (credentials: Credentials) => authApi.login(credentials),
    onSuccess: async (tokens) => {
      useAuthStore.getState().setAccessToken(tokens.access_token);
      const user = await authApi.me();
      useAuthStore.getState().setSession(user, tokens.access_token);
      navigate("/");
    },
  });
}

export function useRegister() {
  return useMutation({ mutationFn: authApi.register });
}
