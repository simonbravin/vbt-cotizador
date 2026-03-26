"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, User, Building2, Calendar, Globe, ShieldCheck, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ReadOnlyProfilePayload = {
  fullName: string;
  email: string;
  phone: string | null;
  image: string | null;
  emailLocale: string;
  emailVerified: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
  isPlatformSuperadmin: boolean;
  organizationName?: string | null;
  /** Prisma OrgMemberRole e.g. org_admin */
  organizationRole?: string | null;
  memberJoinedAt?: string | null;
};

function formatDate(iso: string | null | undefined, locale: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(locale === "es" ? "es" : "en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ReadOnlyProfile({ profile }: { profile: ReadOnlyProfilePayload }) {
  const { t, locale } = useLanguage();
  const loc = locale === "es" ? "es" : "en";
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [phoneInput, setPhoneInput] = useState(profile.phone?.trim() ?? "");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [localeInput, setLocaleInput] = useState<"en" | "es">(profile.emailLocale === "es" ? "es" : "en");
  const [localeSaving, setLocaleSaving] = useState(false);
  const [editingLocale, setEditingLocale] = useState(false);
  const [localeError, setLocaleError] = useState<string | null>(null);

  const [avatarNonce, setAvatarNonce] = useState(0);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyFlash, setVerifyFlash] = useState<string | null>(null);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  useEffect(() => {
    setPhoneInput(profile.phone?.trim() ?? "");
  }, [profile.phone]);
  useEffect(() => {
    setLocaleInput(profile.emailLocale === "es" ? "es" : "en");
  }, [profile.emailLocale]);

  const orgRoleKey = profile.organizationRole
    ? (`superadmin.partner.memberRole.${profile.organizationRole}` as const)
    : null;
  const orgRoleLabel =
    orgRoleKey && t(orgRoleKey) !== orgRoleKey ? t(orgRoleKey) : profile.organizationRole ?? "—";

  const emailLocaleLabel =
    profile.emailLocale === "es"
      ? t("partner.profile.localeEs")
      : t("partner.profile.localeEn");

  const isVerified = Boolean(profile.emailVerified);

  async function savePhone() {
    setPhoneSaving(true);
    setPhoneError(null);
    try {
      const res = await fetch("/api/saas/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhoneError(typeof data.error === "string" ? data.error : t("partner.profile.phoneSaveError"));
        return;
      }
      setEditingPhone(false);
      router.refresh();
    } catch {
      setPhoneError(t("partner.profile.phoneSaveError"));
    } finally {
      setPhoneSaving(false);
    }
  }

  async function saveLocale() {
    setLocaleSaving(true);
    setLocaleError(null);
    try {
      const res = await fetch("/api/saas/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: localeInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLocaleError(typeof data.error === "string" ? data.error : t("partner.profile.localeSaveError"));
        return;
      }
      setEditingLocale(false);
      router.refresh();
    } catch {
      setLocaleError(t("partner.profile.localeSaveError"));
    } finally {
      setLocaleSaving(false);
    }
  }

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadBusy(true);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/saas/profile/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadErr(typeof data.error === "string" ? data.error : t("partner.profile.uploadError"));
        return;
      }
      setAvatarFailed(false);
      setAvatarNonce((n) => n + 1);
      router.refresh();
    } catch {
      setUploadErr(t("partner.profile.uploadError"));
    } finally {
      setUploadBusy(false);
    }
  }

  async function requestVerification() {
    setVerifyBusy(true);
    setVerifyFlash(null);
    setVerifyErr(null);
    try {
      const res = await fetch("/api/saas/profile/request-email-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerifyErr(typeof data.error === "string" ? data.error : t("partner.profile.verifySendError"));
        return;
      }
      setVerifyFlash(t("partner.profile.verifyEmailSent"));
    } catch {
      setVerifyErr(t("partner.profile.verifySendError"));
    } finally {
      setVerifyBusy(false);
    }
  }

  const avatarSrc = `/api/saas/profile/avatar${avatarNonce ? `?t=${avatarNonce}` : ""}`;

  return (
    <div className="surface-card p-6 space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadBusy}
          className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          title={t("partner.profile.uploadPhoto")}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onAvatarSelected}
          />
          {!avatarFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt=""
              className="h-16 w-16 object-cover"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <User className="h-8 w-8 text-muted-foreground" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-foreground">{profile.fullName}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            {profile.email}
          </p>
          <p className="text-xs text-muted-foreground mt-2">{t("partner.profile.uploadPhotoHint")}</p>
          {uploadErr ? <p className="text-xs text-destructive mt-1">{uploadErr}</p> : null}
        </div>
      </div>

      {!isVerified ? (
        <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
          <p className="text-sm text-foreground">{t("partner.profile.verifyEmailPrompt")}</p>
          <Button type="button" size="sm" variant="secondary" onClick={requestVerification} disabled={verifyBusy}>
            {verifyBusy ? t("partner.profile.sending") : t("partner.profile.sendVerifyEmail")}
          </Button>
          {verifyFlash ? <p className="text-xs text-emerald-700 dark:text-emerald-400">{verifyFlash}</p> : null}
          {verifyErr ? <p className="text-xs text-destructive">{verifyErr}</p> : null}
        </div>
      ) : null}

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {profile.isPlatformSuperadmin ? (
          <>
            <dt className="text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("partner.profile.access")}
            </dt>
            <dd className="text-foreground font-medium">{t("partner.profile.platformAdmin")}</dd>
          </>
        ) : null}

        {!profile.isPlatformSuperadmin && profile.organizationName ? (
          <>
            <dt className="text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {t("partner.profile.organization")}
            </dt>
            <dd className="text-foreground">{profile.organizationName}</dd>
            <dt className="text-muted-foreground">{t("partner.profile.roleInOrg")}</dt>
            <dd className="text-foreground">{orgRoleLabel}</dd>
            {profile.memberJoinedAt ? (
              <>
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("partner.profile.memberSince")}
                </dt>
                <dd className="text-foreground">{formatDate(profile.memberJoinedAt, loc) ?? "—"}</dd>
              </>
            ) : null}
          </>
        ) : null}

        <dt className="text-muted-foreground flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" />
          {t("partner.profile.emailLanguage")}
        </dt>
        <dd className="text-foreground">
          {!editingLocale ? (
            <div className="inline-flex items-center gap-2">
              <span>{emailLocaleLabel}</span>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => {
                  setLocaleError(null);
                  setEditingLocale(true);
                }}
              >
                {t("partner.profile.edit")}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-sm border border-input bg-background px-2 text-sm"
                value={localeInput}
                onChange={(e) => setLocaleInput(e.target.value === "es" ? "es" : "en")}
              >
                <option value="es">{t("partner.profile.localeEs")}</option>
                <option value="en">{t("partner.profile.localeEn")}</option>
              </select>
              <Button type="button" size="sm" onClick={saveLocale} disabled={localeSaving}>
                {localeSaving ? t("partner.profile.saving") : t("partner.profile.save")}
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:underline"
                onClick={() => {
                  setEditingLocale(false);
                  setLocaleInput(profile.emailLocale === "es" ? "es" : "en");
                }}
              >
                {t("partner.profile.cancel")}
              </button>
            </div>
          )}
          {localeError ? <p className="text-xs text-destructive mt-1">{localeError}</p> : null}
        </dd>

        <dt className="text-muted-foreground flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5" />
          {t("partner.profile.phone")}
        </dt>
        <dd className="text-foreground">
          {!editingPhone ? (
            <div className="inline-flex items-center gap-2">
              <span>{profile.phone?.trim() ? profile.phone : t("partner.profile.phoneNotSet")}</span>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => {
                  setPhoneError(null);
                  setEditingPhone(true);
                }}
              >
                {t("partner.profile.edit")}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder={t("partner.profile.phonePlaceholder")}
                className="w-[240px] h-9"
                maxLength={40}
              />
              <Button type="button" size="sm" onClick={savePhone} disabled={phoneSaving}>
                {phoneSaving ? t("partner.profile.saving") : t("partner.profile.save")}
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:underline"
                onClick={() => {
                  setEditingPhone(false);
                  setPhoneInput(profile.phone?.trim() ?? "");
                }}
              >
                {t("partner.profile.cancel")}
              </button>
            </div>
          )}
          {phoneError ? <p className="text-xs text-destructive mt-1">{phoneError}</p> : null}
        </dd>

        <dt className="text-muted-foreground">{t("partner.profile.emailVerified")}</dt>
        <dd className="text-foreground">
          {profile.emailVerified ? t("partner.profile.yes") : t("partner.profile.no")}
        </dd>

        <dt className="text-muted-foreground">{t("partner.profile.accountStatus")}</dt>
        <dd className="text-foreground flex items-center gap-1.5">
          {profile.isActive ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              {t("partner.profile.statusActive")}
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              {t("partner.profile.statusInactive")}
            </>
          )}
        </dd>

        <dt className="text-muted-foreground">{t("partner.profile.accountSince")}</dt>
        <dd className="text-foreground">{formatDate(profile.createdAt, loc) ?? "—"}</dd>

        <dt className="text-muted-foreground">{t("partner.profile.lastLogin")}</dt>
        <dd className="text-foreground">{formatDate(profile.lastLoginAt, loc) ?? t("partner.profile.never")}</dd>
      </dl>
    </div>
  );
}
