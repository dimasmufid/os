import { AuthTokensResponse, RefreshResponse } from "@/types/auth";

const ACCESS_COOKIE_NAME = "access_token";
const REFRESH_COOKIE_NAME = "refresh_token";

class ApiClient {
  private baseURL: string;
  private refreshPromise: Promise<void> | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private readonly refreshEndpoint = "/api/v1/auth/refresh";
  private readonly refreshBlacklist = new Set(
    [
      "/api/v1/auth/signin",
      "/api/v1/auth/signup",
      "/api/v1/auth/logout",
      "/api/v1/auth/google",
      "/api/v1/auth/refresh",
      "/api/v1/auth/forgot-password",
      "/api/v1/auth/password/forgot/check",
      "/api/v1/auth/reset-password",
      "/api/v1/auth/password/change",
    ].map((path) => path.toLowerCase())
  );

  constructor() {
    this.baseURL =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    this.hydrateFromCookies();
  }

  private normalizeEndpoint(endpoint: string): string {
    return endpoint.split("?")[0].toLowerCase();
  }

  private shouldAttemptRefresh(endpoint: string): boolean {
    const normalized = this.normalizeEndpoint(endpoint);
    return !this.refreshBlacklist.has(normalized);
  }

  private determineMaxAge(
    seconds?: number | null,
    expiresAt?: string | null
  ): number | null {
    if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) {
      return Math.floor(seconds);
    }

    if (expiresAt) {
      const expires = new Date(expiresAt);
      if (!Number.isNaN(expires.getTime())) {
        const diff = Math.floor((expires.getTime() - Date.now()) / 1000);
        if (diff > 0) {
          return diff;
        }
      }
    }

    return null;
  }

  private setBrowserCookie(
    name: string,
    value: string | null,
    maxAge?: number | null
  ): void {
    if (typeof document === "undefined") {
      return;
    }

    if (!value) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      return;
    }

    const attributes = ["Path=/", "SameSite=Lax"];
    if (typeof maxAge === "number" && Number.isFinite(maxAge) && maxAge > 0) {
      attributes.push(`Max-Age=${Math.floor(maxAge)}`);
    }
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      attributes.push("Secure");
    }

    document.cookie = `${name}=${encodeURIComponent(value)}; ${attributes.join("; ")}`;
  }

  private readBrowserCookie(name: string): string | null {
    if (typeof document === "undefined") {
      return null;
    }

    const pattern = new RegExp(`(?:^|; )${name}=([^;]*)`);
    const match = document.cookie.match(pattern);
    return match ? decodeURIComponent(match[1]) : null;
  }

  private hydrateFromCookies(): void {
    const access = this.readBrowserCookie(ACCESS_COOKIE_NAME);
    const refresh = this.readBrowserCookie(REFRESH_COOKIE_NAME);
    this.accessToken = access;
    this.refreshToken = refresh;
  }

  private applyAuthTokens(
    accessToken: string | null,
    refreshToken: string | null,
    accessMaxAge?: number | null,
    refreshMaxAge?: number | null
  ): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.setBrowserCookie(ACCESS_COOKIE_NAME, accessToken, accessMaxAge);
    this.setBrowserCookie(REFRESH_COOKIE_NAME, refreshToken, refreshMaxAge);
  }

  applyAuthResponse(payload: AuthTokensResponse): void {
    const accessMaxAge = this.determineMaxAge(
      payload.expires_in ?? null,
      payload.expires_at ?? null
    );
    const refreshMaxAge = this.determineMaxAge(
      payload.refresh_expires_in ?? null,
      payload.refresh_expires_at ?? null
    );

    this.applyAuthTokens(
      payload.access_token ?? null,
      payload.refresh_token ?? null,
      accessMaxAge,
      refreshMaxAge
    );
  }

  private applyRefreshResponse(payload: RefreshResponse): void {
    const refreshMaxAge = this.determineMaxAge(
      payload.refresh_expires_in,
      payload.refresh_expires_at ?? null
    );

    this.applyAuthTokens(
      payload.access_token,
      payload.refresh_token,
      payload.expires_in,
      refreshMaxAge
    );
  }

  clearTokens(): void {
    this.applyAuthTokens(null, null);
  }

  private buildHeaders(
    headers?: HeadersInit,
    body?: BodyInit | null
  ): Headers {
    const resolved = new Headers(headers);

    if (
      body &&
      typeof body === "string" &&
      !resolved.has("Content-Type")
    ) {
      resolved.set("Content-Type", "application/json");
    }

    return resolved;
  }

  private async parseBody(response: Response): Promise<unknown> {
    const status = response.status;

    if (status === 204 || status === 205) {
      return null;
    }

    const rawText = await response.text();

    if (!rawText) {
      return null;
    }

    try {
      return JSON.parse(rawText);
    } catch {
      return rawText;
    }
  }

  private buildApiError(response: Response, data: unknown): ApiError {
    let message = "An error occurred";

    if (typeof data === "string" && data) {
      message = data;
    } else if (data && typeof data === "object") {
      const detail = (data as Record<string, unknown>).detail;
      if (typeof detail === "string" && detail) {
        message = detail;
      }
    }

    return new ApiError(message, response.status, data);
  }

  private async refreshSession(): Promise<void> {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const headers = new Headers();
        if (this.refreshToken) {
          headers.set("Authorization", `Bearer ${this.refreshToken}`);
        }

        const response = await fetch(`${this.baseURL}${this.refreshEndpoint}`, {
          method: "POST",
          credentials: "include",
          headers,
        });
        const data = (await this.parseBody(response)) as RefreshResponse | null;
        if (!response.ok) {
          this.clearTokens();
          throw this.buildApiError(response, data);
        }

        if (data) {
          this.applyRefreshResponse(data);
        }
      })().finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }

  async requestRaw(
    endpoint: string,
    options: RequestInit = {},
    retryOnUnauthorized = true
  ): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    const { headers: optionHeaders, ...restOptions } = options;
    const body = restOptions.body ?? null;

    const config: RequestInit = {
      ...restOptions,
      headers: this.buildHeaders(optionHeaders, body),
      credentials: "include",
    };

    const headers = config.headers as Headers;
    if (this.accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    try {
      const response = await fetch(url, config);

      if (
        response.status === 401 &&
        retryOnUnauthorized &&
        this.shouldAttemptRefresh(endpoint)
      ) {
        try {
          await this.refreshSession();
        } catch (refreshError) {
          if (refreshError instanceof ApiError) {
            throw refreshError;
          }
          throw new ApiError("Session refresh failed", 401);
        }

        return this.requestRaw(endpoint, options, false);
      }

      if (!response.ok) {
        const data = await this.parseBody(response);
        throw this.buildApiError(response, data);
      }

      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        throw error;
      }

      const message =
        error instanceof Error && error.message
          ? error.message
          : "Network error occurred";
      throw new ApiError(message, 0);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOnUnauthorized = true
  ): Promise<T> {
    const response = await this.requestRaw(
      endpoint,
      options,
      retryOnUnauthorized
    );
    const data = await this.parseBody(response);
    return data as T;
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", ...options });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", ...options });
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient = new ApiClient();
