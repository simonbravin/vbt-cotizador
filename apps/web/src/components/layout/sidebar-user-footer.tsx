"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { User, LogOut } from "lucide-react";
import { useT } from "@/lib/i18n/context";

const ROLE_BADGE_FALLBACK = "bg-header-foreground/20 text-header-foreground";
const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: "bg-header-foreground/20 text-header-foreground",
  org_admin: "bg-header-foreground/20 text-header-foreground",
  sales_user: "bg-header-foreground/20 text-header-foreground",
  technical_user: "bg-header-foreground/20 text-header-foreground",
  viewer: "bg-header-foreground/20 text-header-foreground",
};

export function SidebarUserFooter({
  displayName,
  role,
  profileHref,
  hasAvatar,
}: {
  displayName: string;
  role: string;
  profileHref: string;
  hasAvatar?: boolean;
}) {
  const t = useT();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const roleLabel = role.replaceAll("_", " ").toUpperCase();

  return (
    <div className="border-t border-header-foreground/10 px-3 py-3">
      <div className="flex items-start gap-2.5">
        <Link
          href={profileHref}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-header-foreground/15 outline-none focus-visible:ring-2 focus-visible:ring-header-foreground/35"
          title={t("nav.settings.profile")}
        >
          {hasAvatar && !avatarFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/api/saas/profile/avatar"
              alt=""
              className="h-full w-full object-cover"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <User className="h-4 w-4 text-header-foreground/80" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={profileHref}
            className="block truncate text-left text-caption font-medium text-header-foreground/90 hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-header-foreground/35"
            title={displayName}
          >
            {displayName}
          </Link>
          <span
            className={`mt-1 inline-block rounded-md px-2 py-0.5 text-micro font-medium uppercase tracking-wide ${ROLE_COLORS[role] ?? ROLE_BADGE_FALLBACK}`}
          >
            {roleLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="shrink-0 rounded-lg p-1.5 text-header-foreground/70 transition-colors hover:bg-header-foreground/10 hover:text-header-foreground"
          title={t("topbar.signOut")}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
