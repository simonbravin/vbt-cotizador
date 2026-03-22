"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { AuthEngineeringShell, AuthFormSurface } from "@/components/auth/AuthEngineeringShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getForgotSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().email(t("auth.emailInvalid")),
  });
}
type FormData = z.infer<ReturnType<typeof getForgotSchema>>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { locale, t } = useLanguage();
  const schema = useMemo(() => getForgotSchema(t), [t]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, locale }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? t("auth.errorGeneric"));
        return;
      }
      setSuccess(true);
    } catch {
      setError(t("auth.errorUnexpected"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthEngineeringShell>
      <AuthFormSurface>
        <h2 className="text-lg font-semibold text-foreground tracking-tight mb-1">{t("auth.forgotPasswordTitle")}</h2>
        <p className="text-sm text-muted-foreground mb-6">{t("auth.forgotPasswordSub")}</p>

        {success ? (
          <div className="space-y-4">
            <div className="p-3 rounded-sm border border-primary/30 bg-primary/10 text-sm text-foreground">
              {t("auth.forgotSuccess")}
            </div>
            <p className="text-center">
              <Link href="/login" className="text-sm text-primary font-medium hover:underline underline-offset-2">
                {t("auth.backToLogin")}
              </Link>
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-sm border border-destructive/30 bg-destructive/10 text-sm text-destructive">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t("auth.email")}
                </label>
                <Input {...register("email")} type="email" autoComplete="email" placeholder={t("auth.placeholderEmail")} />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <Button type="submit" disabled={loading} className="w-full border border-primary/20">
                {loading ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
              </Button>
            </form>
            <p className="text-center mt-6">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-primary hover:underline underline-offset-2">
                {t("auth.backToLogin")}
              </Link>
            </p>
          </>
        )}
      </AuthFormSurface>
    </AuthEngineeringShell>
  );
}
