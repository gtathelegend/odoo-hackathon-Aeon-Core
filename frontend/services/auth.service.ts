import { apiClient } from '../lib/api-client';
import type { AuthTokens, AuthUser } from '../store/auth.store';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

/** Real REST client for the auth module. */
export const authService = {
  login(payload: LoginPayload): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', payload);
  },
  signup(payload: SignupPayload): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', payload);
  },
  me(): Promise<{ user: AuthUser }> {
    return apiClient.get<{ user: AuthUser }>('/auth/me');
  },
  updateProfile(payload: UpdateProfilePayload): Promise<{ user: AuthUser }> {
    return apiClient.patch<{ user: AuthUser }>('/auth/me', payload);
  },
  changePassword(payload: ChangePasswordPayload): Promise<null> {
    return apiClient.post<null>('/auth/change-password', payload);
  },
  forgotPassword(payload: ForgotPasswordPayload): Promise<{ resetToken?: string } | null> {
    return apiClient.post<{ resetToken?: string } | null>('/auth/forgot-password', payload);
  },
  resetPassword(payload: ResetPasswordPayload): Promise<null> {
    return apiClient.post<null>('/auth/reset-password', payload);
  },
  logout(): Promise<unknown> {
    return apiClient.post<unknown>('/auth/logout');
  },
};
