"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    router.prefetch("/overall");
  }, [router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/overall");
    }
  }, [isAuthenticated, isLoading, router]);

  return <LoginForm />;
}
