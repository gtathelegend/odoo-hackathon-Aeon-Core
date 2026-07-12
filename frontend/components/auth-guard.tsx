"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, type AuthRole } from "../store/auth.store";

const ROLE_LEVEL: Record<AuthRole, number> = {
  EMPLOYEE: 1,
  DEPARTMENT_HEAD: 2,
  ASSET_MANAGER: 3,
  ADMIN: 4,
};

interface Props {
  children: React.ReactNode;
  /** Minimum role required to view the page. */
  minRole?: AuthRole;
  /** Explicit whitelist. Overrides `minRole` when supplied. */
  roles?: AuthRole[];
  /** Redirect target when unauthenticated. Defaults to /login. */
  redirectTo?: string;
}

/**
 * Client-side route guard. Renders a placeholder until zustand rehydrates,
 * then either shows children or redirects. Real security is enforced by the
 * API — this guard just avoids flashing protected UI to unauthenticated users.
 */
export function AuthGuard({ children, minRole, roles, redirectTo = "/login" }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);

  const allowed = (() => {
    if (!user) return false;
    if (roles && roles.length > 0) return roles.includes(user.role);
    if (minRole) return ROLE_LEVEL[user.role] >= ROLE_LEVEL[minRole];
    return true;
  })();

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) router.replace(redirectTo);
    else if (!allowed) router.replace("/dashboard");
  }, [hydrated, isAuthenticated, allowed, redirectTo, router]);

  if (!hydrated || !isAuthenticated || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        <div className="text-body-sm font-body-sm">Loading…</div>
      </div>
    );
  }
  return <>{children}</>;
}
