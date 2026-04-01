"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { AuthEngineeringShell, AuthFormSurface } from "@/components/auth/AuthEngineeringShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InviteInfo = {
  partnerName: string;
  email: string;
  role: string;
};

function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const token = searchParams.get("token");

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token?.trim()) {
      setError(t("auth.inviteMissingLink"));
      setLoading(false);
      return;
    }
    fetch(`/api/auth/invite-by-token?token=${encodeURIComponent(token)}`)
      .then((r) => {
        if (!r.ok) {
          if (r.status === 404) setError(t("auth.inviteInvalid"));
          else setError(t("auth.inviteLoadError"));
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setInvite(data);
        setLoading(false);
      })
      .catch(() => {
        setError(t("auth.inviteLoadError"));
        setLoading(false);
      });
  }, [token, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token?.trim() || !invite) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          fullName: fullName.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? t("auth.errorGeneric");
        setSubmitError(data.debug ? `${msg}: ${data.debug}` : msg);
        return;
      }
      setSuccess(true);
      const msg = encodeURIComponent(t("auth.inviteMessageCreated"));
      setTimeout(() => router.push(`/login?message=${msg}`), 2000);
    } catch {
      setSubmitError(t("auth.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AuthEngineeringShell>
        <AuthFormSurface>
          <p className="text-center text-sm text-muted-foreground py-2">{t("auth.inviteLoading")}</p>
        </AuthFormSurface>
      </AuthEngineeringShell>
    );
  }

  if (error || !invite) {
    return (
      <AuthEngineeringShell>
        <AuthFormSurface>
          <p className="text-sm text-destructive mb-4 text-center">{error ?? t("auth.inviteInvalidShort")}</p>
          <p className="text-center">
            <Link href="/login" className="text-sm text-primary font-medium hover:underline underline-offset-2">
              {t("auth.inviteGoSignIn")}
            </Link>
          </p>
        </AuthFormSurface>
      </AuthEngineeringShell>
    );
  }

  if (success) {
    return (
      <AuthEngineeringShell>
        <AuthFormSurface>
          <p className="text-sm font-medium text-foreground text-center">{t("auth.inviteAccountCreated")}</p>
          <p className="text-sm text-muted-foreground text-center mt-2">{t("auth.inviteRedirecting")}</p>
        </AuthFormSurface>
      </AuthEngineeringShell>
    );
  }

  return (
    <AuthEngineeringShell>
      <div className="space-y-4">
        <div className="lg:hidden">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            {t("auth.inviteJoin", { name: invite.partnerName })}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("auth.inviteSubtitle")}</p>
        </div>
        <AuthFormSurface>
          <h2 className="hidden lg:block text-lg font-semibold text-foreground tracking-tight mb-1">
            {t("auth.inviteJoin", { name: invite.partnerName })}
          </h2>
          <p className="hidden lg:block text-sm text-muted-foreground mb-5">{t("auth.inviteSubtitle")}</p>

          <p className="text-sm text-muted-foreground mb-3">
            {t("auth.inviteInvitedAs")} <span className="text-foreground font-medium font-mono text-xs">{invite.role}</span>.{" "}
            {t("auth.inviteCompleteForm")}
          </p>
          <p className="text-xs font-mono text-muted-foreground mb-6 border-b border-border/60 pb-4">
            {t("auth.inviteEmailLabel")} <span className="text-foreground">{invite.email}</span>
          </p>

          {submitError && (
            <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                {t("auth.inviteFullName")}
              </label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("auth.placeholderName")}
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                {t("auth.invitePasswordLabel")}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.invitePasswordPlaceholder")}
                  required
                  minLength={8}
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
            </div>
            <Button type="submit" disabled={submitting} className="w-full border border-primary/20">
              {submitting ? t("auth.inviteCreating") : t("auth.inviteCreateAccount")}
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
      </div>
    </AuthEngineeringShell>
  );
}

function InviteAcceptFallback() {
  const t = useT();
  return (
    <AuthEngineeringShell>
      <AuthFormSurface>
        <p className="text-center text-sm text-muted-foreground py-2">{t("common.loading")}</p>
      </AuthFormSurface>
    </AuthEngineeringShell>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<InviteAcceptFallback />}>
      <InviteAcceptContent />
    </Suspense>
  );
}
