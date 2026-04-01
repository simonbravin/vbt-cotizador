"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

type GoalData = {
  salesTargetAnnualUsd: number | null;
  salesTargetAnnualM2: number | null;
  ytdSales: number;
};

export function GoalKpiCard() {
  const t = useT();
  const [data, setData] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/saas/dashboard/goal")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setData(d as GoalData);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-border/80 bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-muted">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
            {t("dashboard.goalTitle")}
          </span>
        </div>
        <div className="h-8 animate-pulse rounded-lg border border-border/80 bg-muted" />
      </div>
    );
  }

  const target = data?.salesTargetAnnualUsd ?? 0;
  const ytd = data?.ytdSales ?? 0;
  const hasTarget = target > 0;
  const percent = hasTarget ? Math.min(100, (ytd / target) * 100) : 0;
  const exceeded = hasTarget && ytd >= target;

  return (
    <div className="rounded-lg border border-border/80 bg-card p-6">
      <div className="mb-4 flex items-center gap-3 border-b border-border/80 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-muted">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
          {t("dashboard.goalTitle")}
        </span>
      </div>
      {!hasTarget ? (
        <>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{formatCurrency(ytd)}</p>
          <p className="mt-2 text-caption text-muted-foreground">{t("dashboard.goalNoTarget")}</p>
        </>
      ) : (
        <>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatCurrency(ytd)}{" "}
            <span className="text-xl font-medium text-muted-foreground">/ {formatCurrency(target)}</span>
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full border border-border/60 bg-muted">
            <div
              className={`h-full transition-all ${exceeded ? "bg-primary" : "bg-primary/45"}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-3 text-micro uppercase tracking-wide text-muted-foreground">
            {exceeded ? t("dashboard.goalReached") : t("dashboard.goalProgress", { percent: percent.toFixed(0) })}
          </p>
        </>
      )}
    </div>
  );
}
