import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedLayout from "./components/ProtectedLayout";
import CalendarPage from "./features/calendar/components/CalendarPage";
import ChessPage from "./features/chess/components/ChessPage";
import AmirhosseinPage from "./features/amirhossein/components/AmirhosseinPage";
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
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/chess" element={<ChessPage />} />
        <Route path="/amirhossein" element={<AmirhosseinPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
