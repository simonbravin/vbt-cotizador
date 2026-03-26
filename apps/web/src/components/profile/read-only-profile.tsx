"use client";

import { Mail, Phone, User, Building2, Calendar, Globe, ShieldCheck, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

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

  const orgRoleKey = profile.organizationRole
    ? (`superadmin.partner.memberRole.${profile.organizationRole}` as const)
    : null;
  const orgRoleLabel =
    orgRoleKey && t(orgRoleKey) !== orgRoleKey ? t(orgRoleKey) : profile.organizationRole ?? "—";

  const emailLocaleLabel =
    profile.emailLocale === "es"
      ? t("partner.profile.localeEs")
      : t("partner.profile.localeEn");

  return (
    <div className="surface-card p-6 space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted">
          {profile.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.image} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{profile.fullName}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            {profile.email}
          </p>
          {profile.phone?.trim() ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {profile.phone}
            </p>
          ) : null}
        </div>
      </div>

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
        <dd className="text-foreground">{emailLocaleLabel}</dd>

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
