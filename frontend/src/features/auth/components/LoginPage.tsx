import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { useAuthStore } from "../../../stores/auth-store";
import { useLogin, useRegister } from "../hooks/use-login";

export default function LoginPage() {
  const user = useAuthStore((state) => state.user);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const login = useLogin();
  const register = useRegister();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const busy = login.isPending || register.isPending;
  const error = login.error ?? register.error;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (mode === "login") {
      login.mutate({ email, password });
      return;
    }
    register.mutate(
      {
        email,
        password,
        display_name: displayName.trim() || email.split("@")[0],
      },
      { onSuccess: () => login.mutate({ email, password }) },
    );
  }

  return (
    <div className="login-wrapper">
      <div className="card">
        <h2>{mode === "login" ? "Sign in to NexusAI" : "Create your account"}</h2>
        <form className="stack" onSubmit={handleSubmit}>
          {mode === "register" && (
            <input
              placeholder="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              aria-label="Display name"
            />
          )}
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-label="Email"
            required
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-label="Password"
            minLength={8}
            required
          />
          {error && <div className="error-text">{String(error)}</div>}
          <button type="submit" disabled={busy}>
            {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="muted">
          {mode === "login" ? "No account yet? " : "Already registered? "}
          <button
            type="button"
            className="secondary"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
