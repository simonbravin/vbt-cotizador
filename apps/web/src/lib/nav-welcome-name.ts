/** First word of full name for nav greeting; fallback to email local part. */
export function deriveNavWelcomeName(
  fullName: string | null | undefined,
  email: string | null | undefined
): string {
  const trimmed = fullName?.trim();
  if (trimmed) {
    const first = trimmed.split(/\s+/)[0];
    if (first) return first;
  }
  const e = email?.trim();
  if (e) {
    const at = e.indexOf("@");
    if (at > 0) return e.slice(0, at);
    return e;
  }
  return "";
}
