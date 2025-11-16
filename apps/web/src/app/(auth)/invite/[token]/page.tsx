"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { SignupForm } from "@/components/signup-form";
import { LoginForm } from "@/components/login-form";
import { InvitationLookup } from "@/types/auth";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";

function renderTemplate(
  template: string,
  replacements: Record<string, ReactNode>
) {
  return template
    .split(/(\{\{.*?\}\})/g)
    .filter((part) => part !== "")
    .map((part, index) => {
      const match = part.match(/^\{\{(.+)\}\}$/);
      if (match) {
        const key = match[1];
        const replacement = replacements[key];
        return (
          <Fragment key={`${key}-${index}`}>{replacement ?? match[0]}</Fragment>
        );
      }
      return <Fragment key={`text-${index}`}>{part}</Fragment>;
    });
}

export default function InviteSignupPage() {
  const router = useRouter();
  const params = useParams<{ token: string | string[] }>();
  const fallbackErrorMessage = "Tidak dapat memuat undangan.";
  const supportMessage =
    "Silakan hubungi rekan tim yang mengundang Anda atau minta undangan baru.";
  const inviteToken = useMemo(() => {
    if (!params?.token) return "";
    return Array.isArray(params.token) ? params.token[0] : params.token;
  }, [params?.token]);

  const [invitation, setInvitation] = useState<InvitationLookup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken) {
      return;
    }
    let cancelled = false;
    setTimeout(() => {
      setIsLoading(true);
      setError(null);
    }, 0);

    authService
      .getInvitationByToken(inviteToken)
      .then((data) => {
        if (cancelled) return;
        setInvitation(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : null;
        setError(message ?? fallbackErrorMessage);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackErrorMessage, inviteToken]);

  if (!inviteToken) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Undangan tidak tersedia</h2>
          <p className="text-sm text-muted-foreground text-balance">
            Token undangan hilang. Silakan hubungi rekan tim yang mengundang
            Anda atau minta undangan baru.
          </p>
        </div>
        <Button onClick={() => router.push("/signup")} variant="outline">
          Ke halaman pendaftaran
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Memeriksa undangan Anda…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Undangan tidak tersedia</h2>
          <p className="text-sm text-muted-foreground text-balance">
            {error} {supportMessage}
          </p>
        </div>
        <Button onClick={() => router.push("/signup")} variant="outline">
          Ke halaman pendaftaran
        </Button>
      </div>
    );
  }

  if (invitation) {
    const joinMessageTemplate =
      "Anda bergabung dengan {{organization}} sebagai {{role}}.";
    const joinMessage = renderTemplate(joinMessageTemplate, {
      organization: <strong>{invitation.organization_name}</strong>,
      role: <span className="capitalize">{invitation.role}</span>,
    });

    if (invitation.user_exists) {
      return (
        <div className="space-y-4">
          <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-primary">
            <p>
              Undangan ini ditujukan untuk akun{" "}
              <strong>{invitation.email}</strong>. Silakan masuk untuk
              menambahkan workspace ini ke akun Anda.
            </p>
          </div>
          <LoginForm
            inviteToken={inviteToken || undefined}
            defaultEmail={invitation.email}
            onSuccess={() => router.push("/overall")}
          />
          <div className="text-center text-xs text-muted-foreground">
            <p>{joinMessage}</p>
            <p>
              Gunakan email yang diundang agar akses ditautkan secara otomatis.
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        <SignupForm
          inviteToken={inviteToken}
          lockedEmail={invitation.email}
          onSuccess={() => router.push("/overall")}
        />
        <div className="text-center text-xs text-muted-foreground">
          <p>{joinMessage}</p>
        </div>
      </>
    );
  }

  return null;
}
