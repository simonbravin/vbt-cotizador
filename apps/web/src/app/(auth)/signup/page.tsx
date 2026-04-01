"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { AuthEngineeringShell, AuthFormSurface } from "@/components/auth/AuthEngineeringShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getSignupSchema(t: (key: string) => string) {
  return z
    .object({
      name: z.string().min(2, t("auth.nameMin2")),
      email: z.string().email(t("auth.emailInvalid")),
      phone: z.string().max(40, t("auth.phoneTooLong")),
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
type FormData = z.infer<ReturnType<typeof getSignupSchema>>;

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { locale, t } = useLanguage();
  const schema = useMemo(() => getSignupSchema(t), [t]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone?.trim() || undefined,
          password: data.password,
          locale,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? t("auth.signupFailed"));
        return;
      }
      router.push("/pending");
    } catch {
      setError(t("auth.errorUnexpected"));
    } finally {
      setLoading(false);
    }
  }

  const textFields = [
    { id: "name" as const, labelKey: "auth.fullName", type: "text" as const, placeholderKey: "auth.placeholderName" as const },
    { id: "email" as const, labelKey: "auth.email", type: "email" as const, placeholderKey: "auth.placeholderEmailCompany" as const },
    { id: "phone" as const, labelKey: "auth.phone", type: "tel" as const, placeholderKey: "auth.placeholderPhone" as const },
  ];

  return (
    <AuthEngineeringShell>
      <AuthFormSurface>
        <h2 className="text-lg font-semibold text-foreground tracking-tight mb-1">{t("auth.createAccount")}</h2>
        <p className="text-sm text-muted-foreground mb-6">{t("auth.createAccountSub")}</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {textFields.map(({ id, labelKey, type, placeholderKey }) => (
            <div key={id}>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                {t(labelKey)}
              </label>
              <Input {...register(id)} type={type} placeholder={t(placeholderKey)} />
              {errors[id] && <p className="mt-1 text-xs text-destructive">{errors[id]?.message}</p>}
            </div>
          ))}

          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {t("auth.password")}
            </label>
            <div className="relative">
              <Input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.passwordPlaceholder")}
                className="pr-10"
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
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {t("auth.confirmPassword")}
            </label>
            <div className="relative">
              <Input
                {...register("confirmPassword")}
                type={showConfirmPassword ? "text" : "password"}
                placeholder={t("auth.confirmPasswordPlaceholder")}
                className="pr-10"
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
            {loading ? t("auth.requestingAccess") : t("auth.requestAccessBtn")}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border/60 text-center">
          <p className="text-sm text-muted-foreground">
            {t("auth.alreadyAccount")}{" "}
            <Link href="/login" className="text-primary font-medium hover:underline underline-offset-2">
              {t("auth.signInLink")}
            </Link>
          </p>
        </div>
      </AuthFormSurface>
    </AuthEngineeringShell>
  );
}
