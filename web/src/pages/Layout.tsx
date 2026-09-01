import { NavLink, Outlet } from "react-router-dom";
import { api } from "../lib/api";

export function Layout() {
  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <aside className="flex w-56 flex-col border-r border-neutral-800 p-4">
        <h1 className="mb-6 text-lg font-semibold">AppForge Hub</h1>
        <nav className="flex flex-col gap-1 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded px-3 py-2 ${isActive ? "bg-neutral-800 text-white" : "text-neutral-400 hover:bg-neutral-900"}`
            }
          >
            Projects
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `rounded px-3 py-2 ${isActive ? "bg-neutral-800 text-white" : "text-neutral-400 hover:bg-neutral-900"}`
            }
          >
            Settings
          </NavLink>
        </nav>
        <div className="mt-auto">
          <button
            className="w-full rounded px-3 py-2 text-left text-sm text-neutral-400 hover:bg-neutral-900"
            onClick={() => api.logout().then(() => location.reload())}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
