"use client";

import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            ux_mode?: "popup" | "redirect";
            auto_select?: boolean;
          }) => void;
          prompt: (
            callback?: (notification: GooglePromptNotification) => void
          ) => void;
        };
      };
    };
  }
}

interface GoogleCredentialResponse {
  credential?: string;
  clientId?: string;
  select_by?: string;
}

interface GooglePromptNotification {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  isDismissedMoment?: () => boolean;
  getNotDisplayedReason?: () => string | undefined;
  getDismissedReason?: () => string | undefined;
  getSkippedReason?: () => string | undefined;
}

interface GoogleAuthButtonProps
  extends Omit<ComponentProps<typeof Button>, "onClick"> {
  inviteToken?: string | null;
  organizationName?: string | null;
  onSuccess?: () => void;
  onAuthStateChange?: (isAuthenticating: boolean) => void;
}

export function GoogleAuthButton({
  className,
  inviteToken,
  organizationName,
  onSuccess,
  onAuthStateChange,
  disabled,
  children,
  ...buttonProps
}: GoogleAuthButtonProps) {
  const { authenticateWithGoogle } = useAuth();
  const router = useRouter();
  const clientId = useMemo(
    () => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
    []
  );
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSuccessNavigation = useCallback(() => {
    if (onSuccess) {
      onSuccess();
      return;
    }
    router.push("/overall");
  }, [onSuccess, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.google?.accounts?.id) {
      setIsScriptReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      "#google-identity-services"
    );

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        setIsScriptReady(true);
      } else {
        const handleLoad = () => {
          existingScript.dataset.loaded = "true";
          setIsScriptReady(true);
        };
        existingScript.addEventListener("load", handleLoad, { once: true });
        return () => {
          existingScript.removeEventListener("load", handleLoad);
        };
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = "google-identity-services";
    script.onload = () => {
      script.dataset.loaded = "true";
      setIsScriptReady(true);
    };
    script.onerror = () => {
      toast.error("Gagal memuat skrip Google. Silakan coba lagi.");
    };

    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  const handleCredentialResponse = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        console.error("[google-auth]", "Missing credential payload", response);
        setIsProcessing(false);
        onAuthStateChange?.(false);
        toast.error("Kredensial tidak ditemukan. Silakan coba lagi.");
        return;
      }

      try {
        await authenticateWithGoogle({
          credential: response.credential,
          invite_token: inviteToken ?? undefined,
          organization_name: organizationName ?? undefined,
        });

        handleSuccessNavigation();
      } finally {
        setIsProcessing(false);
        onAuthStateChange?.(false);
      }
    },
    [
      authenticateWithGoogle,
      handleSuccessNavigation,
      inviteToken,
      onAuthStateChange,
      organizationName,
    ]
  );

  const handleClick = useCallback(() => {
    console.info("[google-auth]", "Button clicked, client ID:", clientId);
    if (!clientId) {
      toast.error(
        "Google Client ID tidak ditemukan. Silakan hubungi administrator."
      );
      return;
    }

    if (!window.google?.accounts?.id) {
      toast.error(
        "Google Identity Services sedang dimuat. Silakan tunggu sebentar."
      );
      return;
    }

    setIsProcessing(true);
    onAuthStateChange?.(true);

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      ux_mode: "popup",
      auto_select: false,
    });

    window.google.accounts.id.prompt((notification) => {
      console.warn("[google-auth]", "Prompt notification", notification);
      if (
        notification.isNotDisplayed?.() ||
        notification.isSkippedMoment?.() ||
        notification.isDismissedMoment?.()
      ) {
        const getReason =
          notification.getNotDisplayedReason?.() ??
          notification.getDismissedReason?.() ??
          notification.getSkippedReason?.();
        if (getReason) {
          console.warn("[google-auth]", "Prompt dismissed:", getReason);
        }
        if (notification.isNotDisplayed?.()) {
          console.warn(
            "[google-auth]",
            "Google One Tap was not displayed. Check browser console for details."
          );
          toast.error(
            "Google tidak dapat menampilkan dialog masuk. Periksa konsol browser untuk detailnya."
          );
        } else if (notification.isSkippedMoment?.()) {
          toast.error("Proses masuk Google dibatalkan. Silakan coba lagi.");
        }
        setIsProcessing(false);
        onAuthStateChange?.(false);
      }
    });
  }, [clientId, handleCredentialResponse, onAuthStateChange]);

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("w-full", className)}
      onClick={handleClick}
      disabled={disabled || isProcessing || !isScriptReady || !clientId}
      {...buttonProps}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path
          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
          fill="currentColor"
        />
      </svg>
      {isProcessing ? "Menghubungkan..." : children ?? "Masuk dengan Google"}
    </Button>
  );
}
