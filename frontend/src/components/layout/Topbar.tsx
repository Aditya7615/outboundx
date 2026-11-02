import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, Menu, Settings } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  campaigns: "Campaigns",
  new: "New campaign",
  audiences: "Audiences",
  settings: "Settings"
};

function useBreadcrumbs(): string[] {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment) => {
    if (/^\d+$/.test(segment)) return "Campaign detail";
    return labels[segment] ?? segment;
  });
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const breadcrumbs = useBreadcrumbs();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onOpenMenu}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
          <span className="hidden text-xs font-medium text-slate-400 sm:inline">OutboundX</span>
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1.5">
              <ChevronRight className="hidden h-3 w-3 shrink-0 text-slate-300 sm:block" />
              <span
                className={`truncate text-xs ${
                  index === breadcrumbs.length - 1
                    ? "font-semibold text-slate-700"
                    : "font-medium text-slate-400"
                }`}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-50"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[11px] font-semibold text-slate-600">
              {initials(user?.name ?? "User")}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-semibold leading-tight text-slate-800">
                {user?.name}
              </span>
              <span className="block text-[11px] leading-tight text-slate-400">
                {user?.email}
              </span>
            </span>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-56 rounded-md border border-slate-200 bg-white p-1 shadow-md"
            >
              <div className="border-b border-slate-100 px-3 py-2.5">
                <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
                <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/settings");
                }}
                className="mt-1 flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
                role="menuitem"
              >
                <Settings className="h-3.5 w-3.5" />
                Workspace settings
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                role="menuitem"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
