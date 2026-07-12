export { apiClient, API_BASE_URL, ApiError } from '../lib/api-client';
export type { ApiResponse, RequestOptions } from '../lib/api-client';
export { authService } from './auth.service';
export type {
  AuthResponse,
  LoginPayload,
  SignupPayload,
  UpdateProfilePayload,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
} from './auth.service';
export { usersService } from './users.service';
export type {
  UserSummary,
  UsersListQuery,
  CreateUserPayload,
  UpdateUserPayload,
} from './users.service';
export { departmentsService } from './departments.service';
export type {
  Department,
  DepartmentStatus,
  DepartmentsListQuery,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from './departments.service';
export { assetsService } from './assets.service';
export { bookingService } from './booking.service';
export { maintenanceService } from './maintenance.service';
export { reportsService } from './reports.service';
export { assistantService } from './assistant.service';
