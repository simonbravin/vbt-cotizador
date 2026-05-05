"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Radix SelectItem cannot use `value=""`; mapped to this internally when `emptyOptionLabel` is set. */
export const FILTER_SELECT_EMPTY = "__filter_empty__";

export type FilterSelectOption = { value: string; label: string };

export type FilterSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterSelectOption[];
  /** First row; parent state uses `""` when this row is selected. */
  emptyOptionLabel?: string;
  placeholder?: string;
  "aria-label": string;
  triggerClassName?: string;
  disabled?: boolean;
  align?: "start" | "center" | "end";
  sideOffset?: number;
};

export function FilterSelect({
  value,
  onValueChange,
  options,
  emptyOptionLabel,
  placeholder,
  "aria-label": ariaLabel,
  triggerClassName,
  disabled,
  align = "start",
  sideOffset = 6,
}: FilterSelectProps) {
  const hasEmpty = emptyOptionLabel != null && emptyOptionLabel !== "";
  const radixValue = hasEmpty ? (value === "" ? FILTER_SELECT_EMPTY : value) : value;

  const validValues = new Set(
    hasEmpty ? [FILTER_SELECT_EMPTY, ...options.map((o) => o.value)] : options.map((o) => o.value)
  );

  const safeRadixValue = validValues.has(radixValue)
    ? radixValue
    : hasEmpty
      ? FILTER_SELECT_EMPTY
      : (options[0]?.value ?? FILTER_SELECT_EMPTY);

  const handleChange = (v: string) => {
    if (hasEmpty && v === FILTER_SELECT_EMPTY) {
      onValueChange("");
      return;
    }
    onValueChange(v);
  };

  return (
    <Select value={safeRadixValue} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "min-w-[140px] max-w-[min(100vw-2rem,320px)] border-border/80 bg-background",
          triggerClassName
        )}
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" align={align} sideOffset={sideOffset}>
        {hasEmpty ? <SelectItem value={FILTER_SELECT_EMPTY}>{emptyOptionLabel}</SelectItem> : null}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type SearchableFilterSelectProps = FilterSelectProps & {
  /** Placeholder for the search field inside the dropdown. */
  searchPlaceholder: string;
  /** Shown when the query filters out every option (including the empty row, if any). */
  emptyFilterMessage?: string;
};

/**
 * Same contract as `FilterSelect`, with a typeahead filter over option labels (e.g. long project lists).
 */
export function SearchableFilterSelect({
  value,
  onValueChange,
  options,
  emptyOptionLabel,
  placeholder,
  searchPlaceholder,
  emptyFilterMessage,
  "aria-label": ariaLabel,
  triggerClassName,
  disabled,
  align = "start",
  sideOffset = 6,
}: SearchableFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const hasEmpty = emptyOptionLabel != null && emptyOptionLabel !== "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const displayLabel = useMemo(() => {
    if (hasEmpty && value === "") return emptyOptionLabel ?? placeholder ?? null;
    return options.find((o) => o.value === value)?.label ?? placeholder ?? null;
  }, [hasEmpty, value, emptyOptionLabel, placeholder, options]);

  const listIsEmpty = useMemo(() => {
    if (filtered.length > 0) return false;
    if (!query.trim()) return false;
    return true;
  }, [filtered.length, query]);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    setQuery("");
  }, [open]);

  const pick = (v: string) => {
    onValueChange(v);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-lg border border-input bg-background px-3.5 py-2 text-left text-[17px] tracking-[-0.374px] text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus-visible:border-primary focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50",
            triggerClassName
          )}
        >
          <span className={cn("truncate", !displayLabel && "text-muted-foreground")}>
            {displayLabel ?? "—"}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align === "end" ? "end" : align === "center" ? "center" : "start"}
        sideOffset={sideOffset}
        className="min-w-[var(--radix-popover-trigger-width,280px)] max-w-[min(100vw-2rem,480px)] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-border/60 p-2">
          <Input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9"
            aria-label={searchPlaceholder}
          />
        </div>
        <ul
          className="max-h-72 overflow-y-auto py-1"
          role="listbox"
          aria-label={ariaLabel}
        >
          {hasEmpty && !query.trim() ? (
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                className={cn(
                  "flex w-full cursor-default items-center rounded-md px-3 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === "" && "bg-accent/60"
                )}
                onClick={() => pick("")}
              >
                {emptyOptionLabel}
              </button>
            </li>
          ) : null}
          {listIsEmpty ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyFilterMessage ?? "—"}
            </li>
          ) : (
            filtered.map((o) => (
              <li key={o.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === o.value}
                  className={cn(
                    "flex w-full cursor-default items-center rounded-md px-3 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    value === o.value && "bg-accent/60"
                  )}
                  onClick={() => pick(o.value)}
                >
                  <span className="truncate">{o.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
