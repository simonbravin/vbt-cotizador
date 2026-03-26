/**
 * Shared Tailwind classes for list filters (search, native selects, date inputs)
 * so partner pages stay visually aligned with shadcn Input/Button tokens.
 */
export const NATIVE_SELECT_FILTER =
  "flex h-10 min-w-[140px] rounded-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const DATE_INPUT_FILTER =
  "flex h-10 rounded-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/** Full-width search field with left icon slot (add `pl-9` on the input). */
export const FILTER_SEARCH_INPUT =
  "flex h-10 w-full rounded-sm border border-input bg-background py-2 pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
