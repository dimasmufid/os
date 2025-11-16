import { apiClient } from "@/lib/api-client";
import {
  SignupRequest,
  SigninRequest,
  ChangePasswordRequest,
  AuthTokensResponse,
  UserPublic,
  MessageResponse,
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
