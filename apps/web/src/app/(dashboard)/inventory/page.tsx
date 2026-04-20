import Link from "next/link";
import { Settings } from "lucide-react";
import { requireAuth } from "@/lib/utils";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { InventoryClient } from "./InventoryClient";
import { getT, LOCALE_COOKIE_NAME } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/translations";

export default async function InventoryPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE_NAME)?.value === "es" ? "es" : "en") as Locale;
  const t = getT(locale);
  try {
    await requireAuth();
  } catch {
    redirect("/login");
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{t("nav.inventory")}</h1>
          <p className="text-sm text-muted-foreground">{t("partner.inventory.pageSubtitle")}</p>
        </div>
        <Link
          href="/settings/warehouses"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:mt-0.5"
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden />
          {t("partner.settings.configureWarehouses")}
        </Link>
      </div>
      <InventoryClient />
    </div>
  );
}
