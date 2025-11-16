"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { ApiError } from "@/lib/api-client";
import { AUTH_ROUTE_PREFIXES, PUBLIC_ROUTE_PREFIXES } from "@/lib/constant";
import {
  AuthContextType,
  AuthState,
  GoogleAuthRequest,
  SigninRequest,
  SignupRequest,
  UpdateProfileRequest,
  UserPublic,
} from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

type AuthStateUpdater = AuthState | ((previousState: AuthState) => AuthState);

interface ApplyAuthStateAction {
  type: "APPLY";
  updater: AuthStateUpdater;
}

type AuthStateAction = ApplyAuthStateAction;

const applyAuthStateAction = (
  state: AuthState,
  action: AuthStateAction
): AuthState => {
  if (action.type === "APPLY") {
    if (typeof action.updater === "function") {
      return (action.updater as (prev: AuthState) => AuthState)(state);
    }
    return action.updater;
  }

  return state;
};

const initAuthState = (): AuthState => {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  };
};

const matchesRoutePrefix = (pathname: string, prefix: string): boolean => {
  if (prefix === "/") {
    return pathname === "/";
  }

  if (pathname === prefix) {
    return true;
  }

  return pathname.startsWith(`${prefix}/`);
};

export function AuthProvider({ children }: AuthProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const normalizedPathname = pathname ?? "/";
  const hasInitialized = useRef(false);
  const hasRedirectedToLogin = useRef(false);

  const [authState, dispatchAuthState] = useReducer(
    applyAuthStateAction,
    undefined,
    initAuthState
  );

  const setAuthState = useCallback(
    (updater: AuthStateUpdater) => {
      dispatchAuthState({ type: "APPLY", updater });
    },
    [dispatchAuthState]
  );

  const hydrateFromStorage = useCallback(() => {
    const storedUser = authService.getUser();
    if (!storedUser) {
      return;
    }

    setAuthState((prev) => {
      if (prev.user?.id === storedUser.id) {
        return prev;
      }

      return {
        ...prev,
        user: storedUser,
        isAuthenticated: true,
      };
    });
  }, [setAuthState]);

  const initializeAuth = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setAuthState({
        user: currentUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        authService.clearAuth();
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      } else {
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    }
  }, [setAuthState]);

  const isAuthRoute = AUTH_ROUTE_PREFIXES.some((route) =>
    matchesRoutePrefix(normalizedPathname, route)
  );
  const isPublicRoute = PUBLIC_ROUTE_PREFIXES.some((route) =>
    matchesRoutePrefix(normalizedPathname, route)
  );
  const shouldSkipAuthCheck = isPublicRoute || (isAuthRoute && !authState.user);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (shouldSkipAuthCheck) {
      hasInitialized.current = false;
      return;
    }

    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    void initializeAuth();
  }, [initializeAuth, shouldSkipAuthCheck]);

  const computedAuthState = useMemo(() => {
    if (!shouldSkipAuthCheck) {
      return authState;
    }

    const isAuthenticated = Boolean(authState.user);

    if (
      !authState.isLoading &&
      authState.isAuthenticated === isAuthenticated
    ) {
      return authState;
    }

    return {
      ...authState,
      isAuthenticated,
      isLoading: false,
    };
  }, [authState, shouldSkipAuthCheck]);

  useEffect(() => {
    if (shouldSkipAuthCheck) {
      hasRedirectedToLogin.current = false;
      return;
    }

    if (hasRedirectedToLogin.current) {
      return;
    }

    if (computedAuthState.isLoading || computedAuthState.isAuthenticated) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    hasRedirectedToLogin.current = true;
    const redirectTarget = `${window.location.pathname}${window.location.search}`;
    const loginUrl = new URL("/login", window.location.origin);
    if (redirectTarget && redirectTarget !== "/login") {
      loginUrl.searchParams.set("redirect", redirectTarget);
    }
    router.replace(loginUrl.toString());
  }, [
    computedAuthState.isAuthenticated,
    computedAuthState.isLoading,
    router,
    shouldSkipAuthCheck,
  ]);

  const signin = async (credentials: SigninRequest): Promise<UserPublic> => {
    try {
      const response = await authService.signin(credentials);

      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });

      toast.success("Welcome back!");
      return response.user;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 422) {
          toast.error("Please check your credentials and try again.");
        } else {
          toast.error(error.message || "Failed to sign in. Please try again.");
        }
      } else {
        toast.error("Network error. Please check your connection.");
      }
      throw error;
    }
  };

  const signup = async (userData: SignupRequest): Promise<UserPublic> => {
    try {
      const response = await authService.signup(userData);

      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });

      toast.success(
        "Account created successfully! Welcome to Entrefine Omnichannel!"
      );
      return response.user;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 422) {
          // Handle validation errors
          const details = (error.data as { detail?: { msg: string }[] })
            ?.detail;
          if (details && Array.isArray(details)) {
            const errorMessage = details.map((d) => d.msg).join(", ");
            toast.error(`Validation error: ${errorMessage}`);
          } else {
            toast.error("Please check your information and try again.");
          }
        } else {
          toast.error(
            error.message || "Failed to create account. Please try again."
          );
        }
      } else {
        toast.error("Network error. Please check your connection.");
      }
      throw error;
    }
  };

  const authenticateWithGoogle = async (
    payload: GoogleAuthRequest
  ): Promise<UserPublic> => {
    try {
      const response = await authService.authenticateWithGoogle(payload);

      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });

      toast.success("You're signed in with Google.");
      return response.user;
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(
          error.message || "Google sign-in failed. Please try again."
        );
      } else {
        toast.error("Network error. Please check your connection.");
      }
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();

      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      toast.success("Logged out successfully");
    } catch (error) {
      // Even if logout API fails, clear local state
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      if (error instanceof ApiError) {
        toast.error(error.message || "Error during logout");
      } else {
        toast.error("Network error during logout");
      }
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const user = await authService.getCurrentUser();
      setAuthState((prev) => ({
        ...prev,
        user,
      }));
    } catch {
      // If refresh fails, user might need to re-authenticate
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      authService.clearAuth();
    }
  };

  const updateProfile = async (
    updates: UpdateProfileRequest
  ): Promise<UserPublic> => {
    try {
      const updatedUser = await authService.updateProfile(updates);

      setAuthState((prev) => ({
        ...prev,
        user: updatedUser,
      }));

      toast.success("Profile updated successfully.");
      return updatedUser;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 422) {
          const details = (
            error.data as {
              detail?: { msg: string }[];
            }
          )?.detail;
          if (Array.isArray(details) && details.length > 0) {
            toast.error(details.map((item) => item.msg).join("\n"));
          } else {
            toast.error(error.message || "Unable to update profile.");
          }
        } else {
          toast.error(error.message || "Unable to update profile.");
        }
      } else {
        toast.error("Network error. Please check your connection.");
      }
      throw error;
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    try {
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      authService.clearAuth();

      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      toast.success("Password updated. Please sign in again.");
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || "Unable to change password.");
      } else {
        toast.error("Network error. Please check your connection.");
      }
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    ...computedAuthState,
    signin,
    signup,
    authenticateWithGoogle,
    logout,
    refreshUser,
    changePassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
