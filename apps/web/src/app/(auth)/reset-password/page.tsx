"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordPageFallback />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Link reset tidak valid</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Link reset password hilang, tidak valid, atau telah kedaluwarsa.{" "}
            Minta link baru dari{" "}
            <Link href="/login" className="underline underline-offset-4">
              halaman login
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResetPasswordForm token={token} onSuccess={() => router.push("/login")} />
  );
}

function ResetPasswordPageFallback() {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center text-center text-sm text-muted-foreground">
      Menyiapkan formulir reset...
    </div>
  );
}
