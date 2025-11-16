// Auth Request Types
export interface SignupRequest {
  email: string;
  password: string;
  full_name?: string | null;
  profile_picture?: string | null;
  is_verified?: boolean | null;
}

export interface SigninRequest {
  email: string;
  password: string;
}

export interface GoogleAuthRequest {
  credential: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordCheckResponse {
  exists: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirm_password: string;
}

export interface UserPublic {
  id: string;
  email: string;
  full_name?: string | null;
  profile_picture?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokensResponse {
  access_token?: string | null;
  refresh_token?: string | null;
  token_type: string;
  expires_in?: number | null;
  expires_at?: string | null;
  refresh_expires_in?: number | null;
  refresh_expires_at?: string | null;
  user: UserPublic;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_expires_at?: string | null;
}

export interface UpdateProfileRequest {
  full_name?: string | null;
  profile_picture?: string | null;
}

export interface MessageResponse {
  message: string;
}

// Error Types
export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

// Auth State Types
export interface AuthState {
  user: UserPublic | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  signin: (credentials: SigninRequest) => Promise<UserPublic>;
  signup: (userData: SignupRequest) => Promise<UserPublic>;
  authenticateWithGoogle: (payload: GoogleAuthRequest) => Promise<UserPublic>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: UpdateProfileRequest) => Promise<UserPublic>;
}
