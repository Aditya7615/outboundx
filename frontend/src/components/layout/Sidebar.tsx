import { NavLink } from "react-router-dom";
import {
  ArrowUpRight,
  LayoutDashboard,
  Send,
  Settings,
  Users,
  X
} from "lucide-react";
import { cn } from "../../lib/cn";

const primaryNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/campaigns", label: "Campaigns", icon: Send },
  { to: "/audiences", label: "Audiences", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings }
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
          <Send className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-slate-900">OutboundX</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            B2B outreach
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </p>
        {primaryNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
            <p className="text-xs font-semibold text-slate-700">Mock provider online</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Webhook events are signature-verified and applied in real time.
          </p>
          <a
            href="/api/docs"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
          >
            API reference
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-slate-200 bg-white lg:block">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close navigation"
        onClick={onClose}
      />
      <aside className="relative h-full w-60 border-r border-slate-200 bg-white">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}
