"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Warehouse } from "lucide-react";
import { useT } from "@/lib/i18n/context";

type Org = { id: string; name: string };
type WarehouseRow = { id: string; name: string; location: string | null; isActive: boolean };

export function SuperadminInventoryClient() {
  const t = useT();
  const [organizations, setOrganizations] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  const loadOrgs = useCallback(() => {
    setLoadingOrgs(true);
    fetch("/api/saas/partners?limit=200")
      .then((r) => r.json())
      .then((data) => {
        const list = (data.partners ?? []).map((p: { id: string; name: string }) => ({
          id: p.id,
          name: p.name ?? "—",
        })).filter((o: Org) => o.id);
        setOrganizations(list);
        setSelectedOrgId((prev) => (prev ? prev : list[0]?.id ?? ""));
      })
      .catch(() => setOrganizations([]))
      .finally(() => setLoadingOrgs(false));
  }, []);

  useEffect(() => {
    loadOrgs();
  }, []);

  useEffect(() => {
    if (!selectedOrgId) {
      setWarehouses([]);
      return;
    }
    setLoadingWarehouses(true);
    fetch(`/api/saas/warehouses?organizationId=${encodeURIComponent(selectedOrgId)}`)
      .then((r) => r.json())
      .then((data) => setWarehouses(Array.isArray(data.warehouses) ? data.warehouses : []))
      .catch(() => setWarehouses([]))
      .finally(() => setLoadingWarehouses(false));
  }, [selectedOrgId]);

  if (loadingOrgs) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Partner (organización):</label>
        <select
          value={selectedOrgId}
          onChange={(e) => setSelectedOrgId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vbt-blue focus:border-vbt-blue min-w-[200px]"
        >
          <option value="">— Seleccionar —</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {!selectedOrgId ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Seleccioná una organización para ver sus bodegas.</p>
          </div>
        ) : loadingWarehouses ? (
          <div className="p-8 text-center text-sm text-gray-500">{t("common.loading")}</div>
        ) : warehouses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Warehouse className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay bodegas para esta organización.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {warehouses.map((w) => (
              <li key={w.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{w.name}</p>
                  {w.location && (
                    <p className="text-xs text-gray-500">{w.location}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
