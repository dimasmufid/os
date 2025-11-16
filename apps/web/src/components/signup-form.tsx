"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { SignupRequest } from "@/types/auth";
import Link from "next/link";
import { PasswordStrengthMeter } from "@/components/password-strength-meter";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface SignupFormProps extends React.ComponentProps<"form"> {
  onSuccess?: () => void;
  inviteToken?: string | null;
  lockedEmail?: string | null;
}

type SignupFormState = Omit<
  SignupRequest,
  "full_name" | "organization_name" | "invite_token"
> & {
  full_name: string;
  organization_name: string;
  invite_token: string | null;
  profile_picture: string | null;
  confirm_password: string;
};

export function SignupForm({
  className,
  onSuccess,
  inviteToken,
  lockedEmail,
  ...props
}: SignupFormProps) {
  const router = useRouter();
  const { signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<SignupFormState>({
    email: lockedEmail ?? "",
    password: "",
    confirm_password: "",
    full_name: "",
    organization_name: "",
    invite_token: inviteToken ?? null,
    profile_picture: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      invite_token: inviteToken ?? null,
      organization_name: inviteToken ? "" : prev.organization_name,
    }));

    if (inviteToken) {
      setErrors((prev) => {
        if (!prev.organization_name) return prev;
        const rest = { ...prev };
        delete rest.organization_name;
        return rest;
      });
    }
  }, [inviteToken]);

  useEffect(() => {
    if (!lockedEmail) return;
    setFormData((prev) => ({
      ...prev,
      email: lockedEmail,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.email;
      return next;
    });
  }, [lockedEmail]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const emailValue = formData.email.trim();
    if (!emailValue) {
      newErrors.email = "Email wajib diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      newErrors.email = "Masukkan alamat email yang valid";
    } else if (
      lockedEmail &&
      emailValue.toLowerCase() !== lockedEmail.trim().toLowerCase()
    ) {
      newErrors.email = "Email tidak sesuai dengan undangan";
    }

    if (!formData.password) {
      newErrors.password = "Password wajib diisi";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password minimal 8 karakter";
    }

    if (!formData.full_name?.trim()) {
      newErrors.full_name = "Nama lengkap wajib diisi";
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = "Konfirmasi password wajib diisi";
    } else if (formData.confirm_password !== formData.password) {
      newErrors.confirm_password = "Password tidak cocok";
    }

    if (!formData.invite_token && !formData.organization_name?.trim()) {
      newErrors.organization_name = "Nama organisasi wajib diisi";
    }

    if (
      formData.profile_picture &&
      !formData.profile_picture.startsWith("data:image/")
    ) {
      newErrors.profile_picture = "Format foto profil tidak valid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Invalid file"));
        }
      };
      reader.onerror = () => {
        reader.abort();
        reject(new Error("Unable to read file"));
      };
      reader.readAsDataURL(file);
    });

  const handleProfilePictureChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setFormData((prev) => ({
        ...prev,
        profile_picture: null,
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.profile_picture;
        return next;
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        profile_picture: "File harus berupa gambar",
      }));
      event.target.value = "";
      return;
    }

    const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        profile_picture: "Ukuran foto profil maksimal 2MB",
      }));
      event.target.value = "";
      return;
    }

    try {
      const base64 = await readFileAsDataUrl(file);
      setFormData((prev) => ({
        ...prev,
        profile_picture: base64,
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.profile_picture;
        return next;
      });
    } catch {
      setErrors((prev) => ({
        ...prev,
        profile_picture: "Gagal memuat foto profil. Coba file lain.",
      }));
    } finally {
      event.target.value = "";
    }
  };

  const handleProfilePictureReset = () => {
    setFormData((prev) => ({
      ...prev,
      profile_picture: null,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.profile_picture;
      return next;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedForm = {
      ...formData,
      [name]: value,
    } as SignupFormState;

    setFormData(updatedForm);

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    if (
      (name === "password" || name === "confirm_password") &&
      updatedForm.confirm_password
    ) {
      setErrors((prev) => {
        const next = { ...prev };

        if (updatedForm.password === updatedForm.confirm_password) {
          delete next.confirm_password;
        } else {
          next.confirm_password = "Password tidak cocok";
        }

        return next;
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const signupData: SignupRequest = {
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        organization_name: formData.invite_token
          ? null
          : formData.organization_name.trim(),
        invite_token: formData.invite_token || undefined,
        profile_picture: formData.profile_picture ?? undefined,
      };

      await signup(signupData);

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/connectors");
      }
    } catch {
      // Error handling is done in the auth context
    } finally {
      setIsLoading(false);
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
          <h1 className="text-2xl font-bold">Buat akun baru</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Masukkan informasi Anda untuk membuat akun
          </p>
        </div>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="full_name">Nama Lengkap</Label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              placeholder="John Doe"
              value={formData.full_name || ""}
              onChange={handleChange}
              disabled={isLoading}
              required
              className={errors.full_name ? "border-red-500" : ""}
            />
            {errors.full_name && (
              <p className="text-sm text-red-500">{errors.full_name}</p>
            )}
          </div>

          <div className="grid gap-3">
            <Label htmlFor="profile_picture">Foto Profil (opsional)</Label>
            <Input
              id="profile_picture"
              name="profile_picture"
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              disabled={isLoading}
              className={errors.profile_picture ? "border-red-500" : ""}
            />
            {errors.profile_picture && (
              <p className="text-sm text-red-500">{errors.profile_picture}</p>
            )}
            {formData.profile_picture && (
              <div className="flex items-center gap-4">
                <Image
                  src={formData.profile_picture}
                  alt="Preview foto profil"
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover ring-1 ring-muted"
                  unoptimized
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleProfilePictureReset}
                  disabled={isLoading}
                >
                  Hapus foto
                </Button>
              </div>
            )}
          </div>

          {formData.invite_token ? (
            <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-sm text-primary">
              Anda diundang ke workspace ini
            </div>
          ) : (
            <div className="grid gap-3">
              <Label htmlFor="organization_name">Nama Organisasi</Label>
              <Input
                id="organization_name"
                name="organization_name"
                type="text"
                placeholder="PT Contoh"
                value={formData.organization_name || ""}
                onChange={handleChange}
                disabled={isLoading}
                required
                className={errors.organization_name ? "border-red-500" : ""}
              />
              {errors.organization_name && (
                <p className="text-sm text-red-500">
                  {errors.organization_name}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-3">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading || !!lockedEmail}
              required
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="grid gap-3">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              required
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password}</p>
            )}
            <PasswordStrengthMeter password={formData.password} />
          </div>

          <div className="grid gap-3">
            <Label htmlFor="confirm_password">Konfirmasi Password</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              placeholder="••••••••"
              value={formData.confirm_password}
              onChange={handleChange}
              disabled={isLoading}
              required
              className={errors.confirm_password ? "border-red-500" : ""}
            />
            {errors.confirm_password && (
              <p className="text-sm text-red-500">{errors.confirm_password}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Membuat akun..." : "Daftar"}
          </Button>
        </div>
        <div className="text-center text-sm">
          Sudah punya akun?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Masuk
          </Link>
        </div>
      </form>
    </>
  );
}
