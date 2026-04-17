"use client";

import { useState, type ReactNode } from "react";
import { Plus, Download, Search, ChevronDown } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { PANEL_SYSTEM_CODES } from "@/lib/inventory-stock-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  title?: ReactNode;
  searchFilter: string;
  onSearchFilterChange: (value: string) => void;
  tableSystemCodes: Set<string>;
  exportSystemCodes: Set<string>;
  onToggleTableSystem: (code: string) => void;
  onToggleExportSystem: (code: string) => void;
  onExport: () => void;
  exportDisabled: boolean;
  onAddItem: () => void;
};

function SystemChip({
  code,
  active,
  onClick,
}: {
  code: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums border transition-colors shrink-0 ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted"
      }`}
    >
      {code}
    </button>
  );
}

export function InventoryStockToolbar({
  title,
  searchFilter,
  onSearchFilterChange,
  tableSystemCodes,
  exportSystemCodes,
  onToggleTableSystem,
  onToggleExportSystem,
  onExport,
  exportDisabled,
  onAddItem,
}: Props) {
  const t = useT();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  return (
    <div className="border-b border-border">
      {title != null && (
        <div className="px-4 py-2 flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border/60 bg-muted/20">
          {title}
        </div>
      )}
      <div className="px-4 py-2 flex flex-nowrap items-center gap-2 min-w-0 overflow-x-auto">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <input
            type="text"
            placeholder={t("admin.inventory.filterPlaceholder")}
            value={searchFilter}
            onChange={(e) => onSearchFilterChange(e.target.value)}
            className="w-full min-w-[120px] pl-9 pr-3 py-1.5 rounded-lg border border-input bg-background text-sm"
          />
        </div>

        <div
          className="flex shrink-0 items-center gap-1"
          title={t("admin.inventory.systemFilterTable")}
        >
          {PANEL_SYSTEM_CODES.map((code) => (
            <SystemChip
              key={`tbl-${code}`}
              code={code}
              active={tableSystemCodes.has(code)}
              onClick={() => onToggleTableSystem(code)}
            />
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <DropdownMenu open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={exportDisabled}
                aria-label={t("admin.inventory.exportStockCsv")}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium border border-input bg-background hover:bg-muted disabled:opacity-50 whitespace-nowrap"
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline truncate max-w-[11rem]">{t("admin.inventory.exportStockCsv")}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[min(100vw-2rem,16rem)] p-3" sideOffset={6}>
              <DropdownMenuLabel className="px-0 pb-2 text-xs font-normal text-muted-foreground normal-case">
                {t("admin.inventory.exportCsvPopupTitle")}
              </DropdownMenuLabel>
              <div className="flex flex-wrap gap-1.5 pb-3">
                {PANEL_SYSTEM_CODES.map((code) => (
                  <SystemChip
                    key={`csv-${code}`}
                    code={code}
                    active={exportSystemCodes.has(code)}
                    onClick={() => onToggleExportSystem(code)}
                  />
                ))}
              </div>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem
                disabled={exportDisabled}
                className="cursor-pointer gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  onExport();
                  setExportMenuOpen(false);
                }}
              >
                <Download className="h-4 w-4 shrink-0" />
                {t("admin.inventory.exportCsvDownload")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={onAddItem}
            aria-label={t("admin.inventory.addItem")}
            className="inline-flex items-center gap-2 px-2.5 sm:px-4 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{t("admin.inventory.addItem")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
