import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuthStore } from "../stores/auth-store";

export default function Layout() {
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);
  const navigate = useNavigate();

  function handleLogout() {
    // Clears the in-memory session. The refresh cookie expires server-side
    // (and is path-scoped); a production build would also add a /logout
    // endpoint that actively revokes it.
    clear();
    navigate("/login");
  }

  return (
    <>
      <header className="app-header">
        <div className="brand">NexusAI</div>
        <nav className="nav-links" aria-label="Primary">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Tasks
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Calendar
          </NavLink>
          <NavLink
            to="/chess"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Chess
          </NavLink>
          <NavLink
            to="/notebooks"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Notebooks
          </NavLink>
        </nav>
        <div className="row">
          {user && <span className="muted">{user.email}</span>}
          <button className="secondary" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
