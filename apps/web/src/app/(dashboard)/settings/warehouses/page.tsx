import { requireAuth } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { Warehouse, ArrowLeft } from "lucide-react";
import { getT, LOCALE_COOKIE_NAME } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/translations";

export default async function SettingsWarehousesPage() {
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
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("partner.settings.warehouses")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("partner.settings.warehousesDescription")}</p>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <Warehouse className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">
          {locale === "es"
            ? "Gestiona las bodegas de tu organización. La configuración completa estará disponible cuando esté habilitada."
            : "Manage your organization's warehouses. Full configuration will be available when enabled."}
        </p>
      </div>
    </div>
  );
}
