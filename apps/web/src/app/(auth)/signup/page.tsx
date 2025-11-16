"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignupForm } from "@/components/signup-form";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupPageFallback />}>
      <SignupPageContent />
    </Suspense>
  );
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const inviteToken = searchParams.get("invite");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/overall");
    }
  }, [isAuthenticated, isLoading, router]);

  return <SignupForm inviteToken={inviteToken} />;
}

function SignupPageFallback() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="border-muted bg-background flex min-h-96 flex-col items-center justify-center rounded-lg border px-6 py-10 text-center text-sm text-muted-foreground">
        Memuat detail pendaftaran...
      </div>
    </div>
  );
}
