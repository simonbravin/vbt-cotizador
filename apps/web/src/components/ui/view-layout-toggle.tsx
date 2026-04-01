"use client";

import { LayoutGrid, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

export type ViewLayoutMode = "table" | "cards";

type ViewLayoutToggleProps = {
  view: ViewLayoutMode;
  onViewChange: (mode: ViewLayoutMode) => void;
  className?: string;
};

const segmentClass =
  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[15px] font-medium tracking-[-0.02em] transition-colors";

export function ViewLayoutToggle({ view, onViewChange, className }: ViewLayoutToggleProps) {
  const t = useT();

  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-full border border-border/80 bg-filter p-1",
        className
      )}
      role="group"
      aria-label={t("common.viewLayout.groupAria")}
    >
      <button
        type="button"
        onClick={() => onViewChange("table")}
        aria-pressed={view === "table"}
        title={t("common.viewLayout.tableAria")}
        className={cn(
          segmentClass,
          view === "table"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <LayoutList className="h-4 w-4 shrink-0" aria-hidden />
        {t("common.viewLayout.table")}
      </button>
      <button
        type="button"
        onClick={() => onViewChange("cards")}
        aria-pressed={view === "cards"}
        title={t("common.viewLayout.cardsAria")}
        className={cn(
          segmentClass,
          view === "cards"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
        {t("common.viewLayout.cards")}
      </button>
    </div>
  );
}
