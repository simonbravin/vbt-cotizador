"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useT } from "@/lib/i18n/context";

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
        setSubmitError(data.error ?? t("auth.errorGeneric"));
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

  const authLayout = (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-vbt-blue via-blue-900 to-slate-900" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--auth-grid-overlay)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--auth-grid-overlay)) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-vbt-orange/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-blue-400/15 rounded-full blur-3xl" />
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {authLayout}
        <div className="relative z-10 bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 max-w-md w-full text-center">
          <p className="text-white/80">{t("auth.inviteLoading")}</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {authLayout}
        <div className="relative z-10 bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 max-w-md w-full text-center">
          <p className="text-red-300 mb-4">{error ?? t("auth.inviteInvalidShort")}</p>
          <Link href="/login" className="text-vbt-orange hover:underline font-medium">
            {t("auth.inviteGoSignIn")}
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {authLayout}
        <div className="relative z-10 bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 max-w-md w-full text-center">
          <p className="text-green-300 font-medium">{t("auth.inviteAccountCreated")}</p>
          <p className="text-white/70 text-sm mt-2">{t("auth.inviteRedirecting")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {authLayout}
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo-vbt-white.png"
              alt="Vision Building Technologies"
              width={240}
              height={56}
              className="h-14 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white">{t("auth.inviteJoin", { name: invite.partnerName })}</h1>
          <p className="text-slate-300 mt-1 text-sm">{t("auth.inviteSubtitle")}</p>
        </div>

        <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 ring-1 ring-white/10">
          <p className="text-sm text-white/80 mb-4">
            {t("auth.inviteInvitedAs")} <strong>{invite.role}</strong>. {t("auth.inviteCompleteForm")}
          </p>
          <p className="text-sm text-white/70 mb-6">{t("auth.inviteEmailLabel")} <strong className="text-white">{invite.email}</strong></p>

          {submitError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-400/50 rounded-lg text-red-200 text-sm">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">{t("auth.inviteFullName")}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("auth.placeholderName")}
                required
                minLength={2}
                className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-vbt-blue focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">{t("auth.invitePasswordLabel")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.invitePasswordPlaceholder")}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/30 rounded-lg text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-vbt-blue focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-white/50 hover:text-white"
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
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-vbt-orange hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? t("auth.inviteCreating") : t("auth.inviteCreateAccount")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-white/70">
              {t("auth.alreadyAccount")}{" "}
              <Link href="/login" className="text-vbt-orange hover:underline font-medium">
                {t("auth.signInLink")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InviteAcceptFallback() {
  const t = useT();
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-vbt-blue via-blue-900 to-slate-900" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--auth-grid-overlay)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--auth-grid-overlay)) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-vbt-orange/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-blue-400/15 rounded-full blur-3xl" />
      <div className="relative z-10 bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 max-w-md w-full text-center">
        <p className="text-white/80">{t("common.loading")}</p>
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<InviteAcceptFallback />}>
      <InviteAcceptContent />
    </Suspense>
  );
}
