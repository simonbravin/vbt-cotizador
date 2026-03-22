"use client";

import { Suspense, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { AuthEngineeringShell, AuthFormSurface } from "@/components/auth/AuthEngineeringShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getLoginSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().email(t("auth.emailInvalid")),
    password: z.string().min(1, t("auth.passwordRequired")),
  });
}
type FormData = z.infer<ReturnType<typeof getLoginSchema>>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useLanguage();
  const schema = useMemo(() => getLoginSchema(t), [t]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setLoading(false);

    if (!result?.ok) {
      if (result?.error === "PENDING") {
        router.push("/pending");
        return;
      }
      setError(t("auth.invalidCredentials"));
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <AuthFormSurface>
      <h2 className="text-lg font-semibold text-foreground tracking-tight mb-6">{t("auth.signIn")}</h2>

      {searchParams.get("reset") === "success" && (
        <div className="mb-4 p-3 rounded-sm border border-primary/30 bg-primary/10 text-sm text-foreground">
          {t("auth.resetSuccess")}
        </div>
      )}
      {searchParams.get("message") && (
        <div className="mb-4 p-3 rounded-sm border border-primary/30 bg-primary/10 text-sm text-foreground">
          {decodeURIComponent(searchParams.get("message") ?? "")}
        </div>
      )}
      {searchParams.get("error") === "INACTIVE" && (
        <div className="mb-4 p-3 rounded-sm border border-destructive/30 bg-destructive/10 text-sm text-destructive">
          {t("auth.suspended")}
        </div>
      )}

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
          <Input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder={t("auth.placeholderEmail")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            {t("auth.password")}
          </label>
          <div className="relative">
            <Input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
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
        </div>

        <Button type="submit" disabled={loading} className="w-full border border-primary/20">
          {loading ? t("auth.signingIn") : t("auth.signInBtn")}
        </Button>
        <p className="text-center pt-1">
          <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary hover:underline underline-offset-2">
            {t("auth.forgotPassword")}
          </Link>
        </p>
      </form>

      <div className="mt-6 pt-6 border-t border-border/60 text-center">
        <p className="text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline underline-offset-2">
            {t("auth.requestAccess")}
          </Link>
        </p>
      </div>
    </AuthFormSurface>
  );
}

export default function LoginPage() {
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
        <LoginForm />
      </Suspense>
    </AuthEngineeringShell>
  );
}
