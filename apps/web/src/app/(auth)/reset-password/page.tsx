"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { AuthEngineeringShell, AuthFormSurface } from "@/components/auth/AuthEngineeringShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getResetSchema(t: (key: string) => string) {
  return z
    .object({
      password: z
        .string()
        .min(8, t("auth.passwordMin8"))
        .regex(/[A-Z]/, t("auth.passwordUppercase"))
        .regex(/[0-9]/, t("auth.passwordNumber")),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: t("auth.passwordMismatch"),
      path: ["confirmPassword"],
    });
}
type FormData = z.infer<ReturnType<typeof getResetSchema>>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { t } = useLanguage();

  const schema = useMemo(() => getResetSchema(t), [t]);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!token) setError(t("auth.missingResetLink"));
  }, [token, t]);

  async function onSubmit(data: FormData) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? t("auth.errorGeneric"));
        return;
      }
      router.push("/login?reset=success");
      router.refresh();
    } catch {
      setError(t("auth.errorUnexpected"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthFormSurface>
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Link href="/forgot-password" className="text-sm text-primary font-medium hover:underline underline-offset-2">
          {t("auth.requestResetLink")}
        </Link>
      </AuthFormSurface>
    );
  }

  return (
    <AuthFormSurface>
      <h2 className="text-lg font-semibold text-foreground tracking-tight mb-1">{t("auth.resetPasswordTitle")}</h2>
      <p className="text-sm text-muted-foreground mb-6">{t("auth.resetPasswordSub")}</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            {t("auth.newPassword")}
          </label>
          <div className="relative">
            <Input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div>
          <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            {t("auth.confirmPassword")}
          </label>
          <div className="relative">
            <Input
              {...register("confirmPassword")}
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              className="pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            >
              {showConfirmPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" disabled={loading} className="w-full border border-primary/20">
          {loading ? t("auth.settingPassword") : t("auth.setPassword")}
        </Button>
      </form>
      <p className="text-center mt-6">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-primary hover:underline underline-offset-2">
          {t("auth.backToLogin")}
        </Link>
      </p>
    </AuthFormSurface>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLanguage();

  return (
    <AuthEngineeringShell>
      <Suspense
        fallback={
          <AuthFormSurface>
            <p className="text-center text-sm text-muted-foreground py-4">{t("common.loading")}</p>
          </AuthFormSurface>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthEngineeringShell>
  );
}
