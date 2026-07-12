"use client";
import { useEffect } from "react";
import {
  _bindAuthFailureHandler,
  _bindTokenReader,
  _bindTokenRotator,
} from "../lib/api-client";
import { useAuthStore } from "../store/auth.store";
import { authService } from "../services/auth.service";

/**
 * Wires the api-client to the auth store on mount and refreshes the current
 * user profile when we already hold an access token. Renders children eagerly.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const updateAccessToken = useAuthStore((s) => s.updateAccessToken);
  const clear = useAuthStore((s) => s.clear);

  // Bind the low-level api-client hooks exactly once on the client.
  useEffect(() => {
    _bindTokenReader(() => useAuthStore.getState().accessToken);
    _bindAuthFailureHandler(() => useAuthStore.getState().clear());
    _bindTokenRotator((access, refresh) => {
      useAuthStore.getState().updateAccessToken(access, refresh);
    });
  }, []);

  // If we have a token from persisted storage, refresh /auth/me so the UI has
  // fresh user data (and to catch a token that's been server-side revoked).
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authService.me();
        if (!cancelled) setUser(res.user);
      } catch {
        if (!cancelled) clear();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Silence unused warning without affecting behavior.
  void updateAccessToken;

  return <>{children}</>;
}
