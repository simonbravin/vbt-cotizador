import Link from "next/link";
import { Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { SuperadminInventoryClient } from "./SuperadminInventoryClient";
import { getT, LOCALE_COOKIE_NAME } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/translations";

export default async function SuperadminInventoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as { isPlatformSuperadmin?: boolean };
  if (!user.isPlatformSuperadmin) redirect("/dashboard");

  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale: Locale = raw === "es" || raw === "en" ? raw : "en";
  const t = getT(locale);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{t("superadmin.page.inventoryTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("superadmin.page.inventorySubtitle")}</p>
        </div>
        <Link
          href="/superadmin/admin/warehouses"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:mt-0.5"
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden />
          {t("nav.warehouses")}
        </Link>
      </div>
      <SuperadminInventoryClient />
    </div>
  );
}
