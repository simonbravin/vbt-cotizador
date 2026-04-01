"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
