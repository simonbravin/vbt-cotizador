/** Escape a single CSV field (RFC-style). */
export function csvEscapeField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
  const line = (cells: string[]) => cells.map(csvEscapeField).join(",");
  return [line(headers), ...rows.map(line)].join("\r\n");
}
