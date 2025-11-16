import { apiClient } from "@/lib/api-client";
import {
  SignupRequest,
  SigninRequest,
  ChangePasswordRequest,
  AuthTokensResponse,
  UserPublic,
  MessageResponse,
  OrganizationMembership,
  OrganizationMember,
  OrganizationInvitation,
  OrganizationCreateRequest,
  InviteMemberRequest,
  SwitchOrganizationRequest,
  InvitationLookup,
  ForgotPasswordRequest,
  ForgotPasswordCheckResponse,
  ResetPasswordRequest,
  GoogleAuthRequest,
  UpdateProfileRequest,
} from "@/types/auth";

class AuthService {
  private readonly USER_KEY = "user_data";

  async signup(userData: SignupRequest): Promise<AuthTokensResponse> {
    const response = await apiClient.post<AuthTokensResponse>(
      "/api/v1/auth/signup",
      userData
    );

    apiClient.applyAuthResponse(response);
    this.setUser(response.user);

    return response;
  }

  async signin(credentials: SigninRequest): Promise<AuthTokensResponse> {
    const response = await apiClient.post<AuthTokensResponse>(
      "/api/v1/auth/signin",
      credentials
    );

    apiClient.applyAuthResponse(response);
    this.setUser(response.user);

    return response;
  }

  async authenticateWithGoogle(
    payload: GoogleAuthRequest
  ): Promise<AuthTokensResponse> {
    const response = await apiClient.post<AuthTokensResponse>(
      "/api/v1/auth/google",
      payload
    );

    apiClient.applyAuthResponse(response);
    this.setUser(response.user);

    return response;
  }

  async requestPasswordReset(
    payload: ForgotPasswordRequest
  ): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>(
      "/api/v1/auth/forgot-password",
      payload
    );
  }

  async checkForgotPasswordEmail(
    payload: ForgotPasswordRequest
  ): Promise<ForgotPasswordCheckResponse> {
    return apiClient.post<ForgotPasswordCheckResponse>(
      "/api/v1/auth/password/forgot/check",
      payload
    );
  }

  async resetPassword(payload: ResetPasswordRequest): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>(
      "/api/v1/auth/reset-password",
      payload
    );
  }

  async logout(): Promise<MessageResponse> {
    try {
      const response = await apiClient.post<MessageResponse>(
        "/api/v1/auth/logout"
      );

      this.clearAuth();

      return response;
    } catch (error) {
      // Even if the API call fails, clear local storage
      this.clearAuth();
      throw error;
    }
  }

  async getCurrentUser(): Promise<UserPublic> {
    const response = await apiClient.get<UserPublic>("/api/v1/auth/profile");

    this.setUser(response);

    return response;
  }

  async listOrganizations(): Promise<OrganizationMembership[]> {
    return apiClient.get<OrganizationMembership[]>("/api/v1/auth/organizations");
  }

  async createOrganization(
    payload: OrganizationCreateRequest
  ): Promise<AuthTokensResponse> {
    const response = await apiClient.post<AuthTokensResponse>(
      "/api/v1/auth/organizations",
      payload
    );

    apiClient.applyAuthResponse(response);
    this.setUser(response.user);

    return response;
  }

  async listOrganizationMembers(
    organizationId: string
  ): Promise<OrganizationMember[]> {
    return apiClient.get<OrganizationMember[]>(
      `/api/v1/auth/organizations/${organizationId}/members`
    );
  }

  async removeOrganizationMember(
    organizationId: string,
    memberId: string
  ): Promise<MessageResponse> {
    return apiClient.delete<MessageResponse>(
      `/api/v1/auth/organizations/${organizationId}/members/${memberId}`
    );
  }

  async listOrganizationInvitations(
    organizationId: string
  ): Promise<OrganizationInvitation[]> {
    return apiClient.get<OrganizationInvitation[]>(
      `/api/v1/auth/organizations/${organizationId}/invitations`
    );
  }

  async cancelOrganizationInvitation(
    organizationId: string,
    invitationId: string
  ): Promise<MessageResponse> {
    return apiClient.delete<MessageResponse>(
      `/api/v1/auth/organizations/${organizationId}/invitations/${invitationId}`
    );
  }

  async getInvitationByToken(token: string): Promise<InvitationLookup> {
    return apiClient.get<InvitationLookup>(`/api/v1/auth/invitations/${token}`);
  }

  async inviteMember(
    organizationId: string,
    payload: InviteMemberRequest
  ): Promise<OrganizationInvitation> {
    return apiClient.post<OrganizationInvitation>(
      `/api/v1/auth/organizations/${organizationId}/invite`,
      payload
    );
  }

  async acceptInvitation(token: string): Promise<void> {
    await apiClient.post<void>(`/api/v1/invitations/${token}/accept`);
  }

  async changePassword(
    payload: ChangePasswordRequest
  ): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>(
      "/api/v1/auth/password/change",
      payload
    );
  }

  async updateProfile(payload: UpdateProfileRequest): Promise<UserPublic> {
    const response = await apiClient.patch<UserPublic>(
      "/api/v1/auth/profile",
      payload
    );

    this.setUser(response);

    return response;
  }

  async switchOrganization(
    payload: SwitchOrganizationRequest
  ): Promise<AuthTokensResponse> {
    const response = await apiClient.post<AuthTokensResponse>(
      "/api/v1/auth/organizations/select",
      payload
    );

    apiClient.applyAuthResponse(response);
    this.setUser(response.user);

    return response;
  }

  // User data management
  setUser(user: UserPublic): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getUser(): UserPublic | null {
    if (typeof window === "undefined") return null;
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  // Clear all auth data
  clearAuth(): void {
    apiClient.clearTokens();
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.USER_KEY);
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getUser() !== null;
  }
}

export const authService = new AuthService();
