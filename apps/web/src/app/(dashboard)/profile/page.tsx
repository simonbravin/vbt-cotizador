import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/utils";
import { getEffectiveActiveOrgId } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { ReadOnlyProfile } from "@/components/profile/read-only-profile";
import { getT, LOCALE_COOKIE_NAME } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/translations";

/** Partner profile (all roles). Outside `/settings` so viewers are not blocked by settings layout. */
export default async function PartnerProfilePage() {
  const user = await requireAuth();
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE_NAME)?.value === "es" ? "es" : "en") as Locale;
  const t = getT(locale);

  const effectiveOrgId = await getEffectiveActiveOrgId(user);

  const [dbUser, membership, orgRow] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        fullName: true,
        email: true,
        phone: true,
        image: true,
        emailLocale: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        isActive: true,
        isPlatformSuperadmin: true,
      },
    }),
    effectiveOrgId
      ? prisma.orgMember.findFirst({
          where: { userId: user.userId, organizationId: effectiveOrgId, status: "active" },
          select: { role: true, joinedAt: true, createdAt: true },
        })
      : null,
    effectiveOrgId
      ? prisma.organization.findUnique({ where: { id: effectiveOrgId }, select: { name: true } })
      : null,
  ]);

  if (!dbUser) redirect("/login");

  const memberJoined = membership?.joinedAt ?? membership?.createdAt;

  const profile = {
    fullName: dbUser.fullName,
    email: dbUser.email,
    phone: dbUser.phone,
    image: dbUser.image,
    emailLocale: dbUser.emailLocale,
    emailVerified: dbUser.emailVerified?.toISOString() ?? null,
    createdAt: dbUser.createdAt.toISOString(),
    lastLoginAt: dbUser.lastLoginAt?.toISOString() ?? null,
    isActive: dbUser.isActive,
    isPlatformSuperadmin: dbUser.isPlatformSuperadmin,
    organizationName: orgRow?.name ?? null,
    organizationRole: membership?.role ?? (typeof user.role === "string" ? user.role : null),
    memberJoinedAt: memberJoined ? memberJoined.toISOString() : null,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("partner.profile.backToDashboard")}
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("partner.profile.title")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("partner.profile.subtitle")}</p>
      </div>
      <ReadOnlyProfile profile={profile} />
    </div>
  );
}
