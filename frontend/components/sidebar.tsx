"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import type { AuthRole } from "../store/auth.store";

type NavItem = {
  href: string;
  icon: string;
  label: string;
  minRole?: AuthRole;
};

const navItems: NavItem[] = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/organization", icon: "corporate_fare", label: "Organization Setup", minRole: "ASSET_MANAGER" },
  { href: "/admin/users", icon: "manage_accounts", label: "User Management", minRole: "ASSET_MANAGER" },
  { href: "/assets", icon: "inventory_2", label: "Assets" },
  { href: "/allocation", icon: "swap_horiz", label: "Allocation & Transfer" },
  { href: "/booking", icon: "event_available", label: "Resource Booking" },
  { href: "/maintenance", icon: "build", label: "Maintenance" },
  { href: "/audit", icon: "fact_check", label: "Audit", minRole: "ASSET_MANAGER" },
  { href: "/reports", icon: "analytics", label: "Reports", minRole: "DEPARTMENT_HEAD" },
  { href: "/activity", icon: "history", label: "Activity Log", minRole: "ASSET_MANAGER" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasMinRole } = useAuth();

  return (
    <nav className="hidden md:flex flex-col h-full py-stack-lg bg-ink fixed left-0 top-0 w-sidebar-width z-50 overflow-y-auto scrollbar-hide">
      <div className="px-6 mb-8">
        <h1 className="text-headline-md font-headline-md font-black text-on-primary tracking-tight">AssetFlow</h1>
        <p className="text-label-caps font-label-caps text-on-primary-container/70 uppercase mt-1">Enterprise EAM</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            if (item.minRole && !hasMinRole(item.minRole)) return null;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-body-sm font-body-sm transition-all ${
                    isActive
                      ? "bg-white/10 text-on-primary border-l-4 border-available"
                      : "text-on-primary/60 hover:text-on-primary hover:bg-white/10"
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-auto border-t border-on-primary-container/20 pt-4 px-2 space-y-1">
        {user && (
          <div className="px-4 py-2 text-body-sm font-body-sm text-on-primary/70 truncate">
            <div className="text-on-primary text-body-sm font-medium truncate">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-label-caps text-label-caps uppercase text-on-primary-container/70 mt-0.5">
              {user.role.replace("_", " ")}
            </div>
          </div>
        )}
        <Link
          href="/profile"
          className="flex items-center gap-3 text-on-primary/60 hover:text-on-primary px-4 py-3 hover:bg-white/10 transition-all text-body-sm font-body-sm"
        >
          <span className="material-symbols-outlined">person</span>
          <span>Profile</span>
        </Link>
        {user ? (
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 text-on-primary/60 hover:text-on-primary px-4 py-3 hover:bg-white/10 transition-all text-body-sm font-body-sm text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 text-on-primary/60 hover:text-on-primary px-4 py-3 hover:bg-white/10 transition-all text-body-sm font-body-sm"
          >
            <span className="material-symbols-outlined">login</span>
            <span>Sign in</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
