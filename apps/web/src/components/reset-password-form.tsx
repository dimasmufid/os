"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";
import { useRouter } from "next/navigation";

interface ResetPasswordFormProps extends React.ComponentProps<"form"> {
  token: string;
  onSuccess?: () => void;
}

interface ResetPasswordState {
  password: string;
  confirmPassword: string;
}

export function ResetPasswordForm({
  className,
  token,
  onSuccess,
  ...props
}: ResetPasswordFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<ResetPasswordState>({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!formData.password) {
      nextErrors.password = "Password wajib diisi";
    } else if (formData.password.length < 8) {
      nextErrors.password = "Password minimal 8 karakter";
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = "Konfirmasi password wajib diisi";
    } else if (formData.confirmPassword !== formData.password) {
      nextErrors.confirmPassword = "Password tidak cocok";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
    if (formError) {
      setFormError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await authService.resetPassword({
        token,
        password: formData.password,
        confirm_password: formData.confirmPassword,
      });
      toast.success("Password berhasil direset. Silakan masuk dengan password baru.");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/login");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400 || error.status === 422) {
          const details = (
            error.data as { detail?: string | { msg: string }[] }
          )?.detail;
          if (typeof details === "string") {
            setFormError(details);
          } else if (Array.isArray(details) && details.length > 0) {
            const message = details.map((item) => item.msg).join(", ");
            setFormError(message);
          } else {
            setFormError(
              error.message ||
                "Terjadi kesalahan. Silakan coba lagi."
            );
          }
        } else {
          toast.error(
            error.message ||
              "Terjadi kesalahan. Silakan coba lagi."
          );
        }
      } else {
        toast.error("Kesalahan jaringan. Silakan periksa koneksi Anda.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      {...props}
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">
          Atur Ulang Password
        </h1>
        <p className="text-muted-foreground text-sm text-balance">
          Masukkan password baru Anda
        </p>
      </div>
      {formError && (
        <div className="bg-destructive/5 border-destructive text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </div>
      )}
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="password">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            disabled={isSubmitting}
            required
            className={errors.password ? "border-red-500" : ""}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password}</p>
          )}
        </div>
        <div className="grid gap-3">
          <Label htmlFor="confirmPassword">
            Konfirmasi Password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isSubmitting}
            required
            className={errors.confirmPassword ? "border-red-500" : ""}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? "Mengirim..."
            : "Atur Ulang Password"}
        </Button>
      </div>
      <div className="text-center text-sm">
        Ingat password Anda?{" "}
        <Link
          href="/login"
          className="underline underline-offset-4"
        >
          Masuk
        </Link>
      </div>
    </form>
  );
}
