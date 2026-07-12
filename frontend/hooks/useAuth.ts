"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, type AuthRole } from "../store/auth.store";
import { authService, type LoginPayload, type SignupPayload } from "../services/auth.service";
import { ROLES } from "../constants/roles";

const ROLE_LEVEL: Record<AuthRole, number> = {
  EMPLOYEE: 1,
  DEPARTMENT_HEAD: 2,
  ASSET_MANAGER: 3,
  ADMIN: 4,
};

/** Convenience hook exposing session state + auth actions. */
export function useAuth() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await authService.login(payload);
      setSession(res.user, res.tokens);
      return res.user;
    },
    [setSession],
  );

  const signup = useCallback(
    async (payload: SignupPayload) => {
      const res = await authService.signup(payload);
      setSession(res.user, res.tokens);
      return res.user;
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignore — we still clear local state below
    }
    clear();
    router.push("/login");
  }, [clear, router]);

  const hasRole = useCallback(
    (...roles: AuthRole[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const hasMinRole = useCallback(
    (min: AuthRole) => (user ? ROLE_LEVEL[user.role] >= ROLE_LEVEL[min] : false),
    [user],
  );

  return {
    user,
    isAuthenticated,
    hydrated,
    login,
    signup,
    logout,
    hasRole,
    hasMinRole,
    ROLES,
  };
}
