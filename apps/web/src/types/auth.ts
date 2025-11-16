// Auth Request Types
export interface SignupRequest {
  email: string;
  password: string;
  full_name?: string | null;
  organization_name?: string | null;
  invite_token?: string | null;
  profile_picture?: string | null;
  is_verified?: boolean | null;
}

export interface SigninRequest {
  email: string;
  password: string;
  organization_id?: string | null;
}

export interface GoogleAuthRequest {
  credential: string;
  invite_token?: string | null;
  organization_name?: string | null;
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

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  business_image?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  id: string;
  role: string;
  is_default: boolean;
  joined_at: string;
  organization: OrganizationSummary;
}

export interface OrganizationMemberUser {
  id: string;
  email: string;
  full_name?: string | null;
  profile_picture?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  role: string;
  is_default: boolean;
  joined_at: string;
  user: OrganizationMemberUser;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expires_at?: string | null;
  invited_at: string;
  accepted_at?: string | null;
  invited_by?: string | null;
}

export interface InvitationLookup extends OrganizationInvitation {
  organization_name: string;
  user_exists: boolean;
}

export interface UserPublic {
  id: string;
  email: string;
  full_name?: string | null;
  profile_picture?: string | null;
  created_at: string;
  updated_at: string;
  memberships: OrganizationMembership[];
  active_organization_id?: string | null;
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

export interface OrganizationCreateRequest {
  name: string;
}

export interface InviteMemberRequest {
  email: string;
  role?: string;
}

export interface SwitchOrganizationRequest {
  organization_id: string;
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
  activeOrganizationId: string | null;
}

export interface AuthContextType extends AuthState {
  signin: (credentials: SigninRequest) => Promise<UserPublic>;
  signup: (userData: SignupRequest) => Promise<UserPublic>;
  authenticateWithGoogle: (payload: GoogleAuthRequest) => Promise<UserPublic>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (name: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: UpdateProfileRequest) => Promise<UserPublic>;
}
