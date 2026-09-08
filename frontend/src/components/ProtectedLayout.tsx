import { Navigate } from "react-router-dom";

import { useAuthStore } from "../stores/auth-store";
import Layout from "./Layout";

/**
 * Route guard: the single place that decides "is this visitor authenticated?"
 * All protected routes nest under it, so adding a new page never means
 * re-implementing the check.
 */
export default function ProtectedLayout() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}
