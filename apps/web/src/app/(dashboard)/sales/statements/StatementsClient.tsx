"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getInvoicedAmount } from "@/lib/sales";
import { ArrowLeft, Download } from "lucide-react";

type Statement = {
  client: { id: string; name: string };
  sales: any[];
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
};
type Entity = { id: string; name: string; slug: string };

export function StatementsClient() {
  const [data, setData] = useState<{ statements: Statement[]; entities: Entity[]; filters: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [entityId, setEntityId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", clientId);
    if (entityId) params.set("entityId", entityId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/sales/statements?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clientId, entityId, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetch("/api/clients?limit=500").then((r) => r.json()).then((d) => setClients(d.clients ?? []));
  }, []);

  const handleExport = () => {
    const params = new URLSearchParams();
    params.set("format", "csv");
    if (clientId) params.set("clientId", clientId);
    if (entityId) params.set("entityId", entityId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/sales/statements/export?${params}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <Link href="/sales" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Sales
      </Link>

      <div className="flex flex-wrap gap-2 items-center">
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm min-w-[160px]">
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={entityId} onChange={(e) => setEntityId(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm min-w-[160px]">
          <option value="">All entities</option>
          {data?.entities?.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
        <button type="button" onClick={fetchData} className="px-3 py-1.5 bg-vbt-blue text-white rounded-lg text-sm font-medium">
          Apply
        </button>
        <button type="button" onClick={handleExport} className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : !data?.statements?.length ? (
          <div className="p-8 text-center text-gray-500">No data for the selected filters</div>
        ) : (
          <div className="p-4 space-y-6">
            {data.statements.map((st) => (
              <div key={st.client.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-semibold text-gray-900">{st.client.name}</h2>
                  <div className="text-sm">
                    <span className="text-gray-500">Invoiced: </span>
                    <span className="font-medium">{formatCurrency(st.totalInvoiced)}</span>
                    <span className="text-gray-500 ml-3">Paid: </span>
                    <span className="font-medium">{formatCurrency(st.totalPaid)}</span>
                    <span className="text-gray-500 ml-3">Balance: </span>
                    <span className={`font-medium ${st.balance > 0 ? "text-amber-600" : "text-gray-900"}`}>{formatCurrency(st.balance)}</span>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2 pr-4">Sale #</th>
                      <th className="pb-2 pr-4">Project</th>
                      <th className="pb-2 pr-4 text-right">Invoiced</th>
                      <th className="pb-2 pr-4 text-right">Paid</th>
                      <th className="pb-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {st.sales.map((sale: any) => {
                      const invTotal = getInvoicedAmount(sale);
                      const payTotal = sale.payments?.reduce((a: number, p: any) => a + (p.amountUsd ?? 0), 0) ?? 0;
                      return (
                        <tr key={sale.id} className="border-b border-gray-50">
                          <td className="py-2 pr-4">
                            <Link href={`/sales/${sale.id}`} className="text-vbt-blue hover:underline">
                              {sale.saleNumber ?? sale.id?.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="py-2 pr-4 text-gray-700">{sale.project?.name ?? ""}</td>
                          <td className="py-2 pr-4 text-right text-gray-700">{formatCurrency(invTotal)}</td>
                          <td className="py-2 pr-4 text-right text-gray-700">{formatCurrency(payTotal)}</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(invTotal - payTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
