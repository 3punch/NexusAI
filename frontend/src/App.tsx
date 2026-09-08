import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedLayout from "./components/ProtectedLayout";
import { useBootstrapAuth } from "./features/auth/hooks/use-bootstrap-auth";
import LoginPage from "./features/auth/components/LoginPage";
import DashboardPage from "./features/tasks/components/DashboardPage";

export default function App() {
  const status = useBootstrapAuth();

  if (status === "loading") {
    return <div className="page-loading">Restoring session…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
