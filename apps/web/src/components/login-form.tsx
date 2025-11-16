"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { authService } from "@/services/auth.service";
import { SigninRequest } from "@/types/auth";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { useRouter } from "next/navigation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginFormProps extends React.ComponentProps<"form"> {
  onSuccess?: () => void;
}

export function LoginForm({ className, onSuccess, ...props }: LoginFormProps) {
  const router = useRouter();
  const { signin, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [formData, setFormData] = useState<SigninRequest>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(
    null
  );
  const [isSendingReset, setIsSendingReset] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email wajib diisi";
    } else if (!EMAIL_REGEX.test(formData.email)) {
      newErrors.email = "Masukkan alamat email yang valid";
    }

    if (!formData.password) {
      newErrors.password = "Password wajib diisi";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormDisabled = isLoading || isRedirecting || isAuthenticated;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleForgotDialogChange = (open: boolean) => {
    setIsForgotPasswordOpen(open);

    if (open) {
      setForgotPasswordEmail(formData.email.trim());
      setForgotPasswordError(null);
    } else {
      setIsSendingReset(false);
      setForgotPasswordError(null);
    }
  };

  const handleForgotPasswordSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const trimmedEmail = forgotPasswordEmail.trim();
    if (!trimmedEmail) {
      setForgotPasswordError("Email wajib diisi");
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setForgotPasswordError("Masukkan alamat email yang valid");
      return;
    }

    setIsSendingReset(true);
    setForgotPasswordError(null);

    try {
      const eligibility = await authService.checkForgotPasswordEmail({
        email: trimmedEmail,
      });

      if (!eligibility.exists) {
        const feedback =
          eligibility.message || "Email tidak terdaftar pada sistem kami.";
        setForgotPasswordError(feedback);
        toast.error(feedback);
        return;
      }

      await authService.requestPasswordReset({ email: trimmedEmail });
      toast.success(
        "Instruksi reset password telah dikirim ke email yang terdaftar."
      );
      setIsForgotPasswordOpen(false);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 422) {
          const details = (error.data as { detail?: { msg: string }[] })
            ?.detail;
          if (Array.isArray(details) && details.length > 0) {
            setForgotPasswordError(details[0].msg);
            return;
          }
        }
        toast.error(
          error.message ||
            "Tidak dapat mengirim instruksi reset. Silakan coba lagi."
        );
      } else {
        toast.error("Kesalahan jaringan. Silakan periksa koneksi Anda.");
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setIsRedirecting(false);

    try {
      await signin({
        email: formData.email.trim(),
        password: formData.password,
      });

      setIsLoading(false);
      setIsRedirecting(true);

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/world");
      }
    } catch {
      setIsLoading(false);
      setIsRedirecting(false);
    }
  };

  const handleGoogleSuccess = () => {
    setIsLoading(false);
    setIsRedirecting(true);
    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/world");
    }
  };
  return (
    <>
      <form
        className={cn("flex flex-col gap-6", className)}
        {...props}
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Masuk ke akun Anda</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Masukkan email Anda di bawah untuk masuk ke akun
          </p>
        </div>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isFormDisabled}
              required
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>
          <div className="grid gap-3">
            <Dialog
              open={isForgotPasswordOpen}
              onOpenChange={handleForgotDialogChange}
            >
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                    disabled={isFormDisabled}
                  >
                    Lupa password?
                  </button>
                </DialogTrigger>
              </div>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Reset password Anda</DialogTitle>
                  <DialogDescription>
                    Masukkan email yang terhubung dengan akun Anda dan kami akan
                    mengirimkan link reset password.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="grid gap-4"
                  onSubmit={handleForgotPasswordSubmit}
                >
                  <div className="grid gap-2">
                    <Label htmlFor="forgot-password-email">Email</Label>
                    <Input
                      id="forgot-password-email"
                      type="email"
                      placeholder="m@example.com"
                      autoFocus
                      value={forgotPasswordEmail}
                      onChange={(event) => {
                        setForgotPasswordEmail(event.target.value);
                        if (forgotPasswordError) {
                          setForgotPasswordError(null);
                        }
                      }}
                      disabled={isSendingReset}
                      className={forgotPasswordError ? "border-red-500" : ""}
                    />
                    {forgotPasswordError && (
                      <p className="text-sm text-red-500">
                        {forgotPasswordError}
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSendingReset}
                      >
                        Batal
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSendingReset}>
                      {isSendingReset ? "Mengirim..." : "Kirim link reset"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              disabled={isFormDisabled}
              required
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isFormDisabled}>
            {isRedirecting
              ? "Mengalihkan..."
              : isLoading
              ? "Masuk..."
              : "Masuk"}
          </Button>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              Atau lanjutkan dengan
            </span>
          </div>
          <GoogleAuthButton
            className="w-full"
            onAuthStateChange={setIsLoading}
            onSuccess={handleGoogleSuccess}
            disabled={isFormDisabled}
          >
            Masuk dengan Google
          </GoogleAuthButton>
        </div>
        <div className="text-center text-sm">
          Belum punya akun?{" "}
          <Link href="/signup" className="underline underline-offset-4">
            Daftar
          </Link>
        </div>
      </form>
    </>
  );
}
