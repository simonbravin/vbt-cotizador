/**
 * User-visible message from JSON returned by `/api/saas/*` (`normalizeApiError` / `withSaaSHandler`).
 * Supports legacy `{ error: string }` and structured `{ error: { code, message, details } }`.
 */

export type SaasTranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export function saasApiErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const err = (data as Record<string, unknown>).error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && typeof (err as Record<string, unknown>).message === "string") {
    return (err as Record<string, unknown>).message as string;
  }
  return null;
}

export function saasApiErrorMessageOr(data: unknown, fallback: string): string {
  return saasApiErrorMessage(data) ?? fallback;
}

function parseStructuredApiError(data: unknown): {
  code: string;
  message: string;
  details: Array<{ path?: string; message: string }>;
} | null {
  if (!data || typeof data !== "object") return null;
  const err = (data as Record<string, unknown>).error;
  if (typeof err === "string" || !err || typeof err !== "object") return null;
  const rec = err as Record<string, unknown>;
  if (typeof rec.message !== "string" || typeof rec.code !== "string") return null;
  const rawDetails = rec.details;
  const details: Array<{ path?: string; message: string }> = [];
  if (Array.isArray(rawDetails)) {
    for (const d of rawDetails) {
      if (d && typeof d === "object" && typeof (d as { message?: unknown }).message === "string") {
        const pathVal = (d as { path?: unknown }).path;
        details.push({
          path: typeof pathVal === "string" ? pathVal : undefined,
          message: (d as { message: string }).message,
        });
      }
    }
  }
  return { code: rec.code, message: rec.message, details };
}

/**
 * Resolves a localized message when `error.code` matches `apiErrors.*` in i18n; otherwise uses API `message` or fallback.
 */
export function saasApiUserFacingMessage(data: unknown, t: SaasTranslateFn, fallback: string): string {
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    const err = rec.error;
    const topCode = typeof rec.code === "string" ? rec.code : null;
    if (typeof err === "string" && topCode) {
      const key = `apiErrors.${topCode}`;
      const tr = t(key);
      if (tr !== key) return tr;
      return err;
    }
    if (typeof err === "string") return err;
  }

  const structured = parseStructuredApiError(data);
  if (!structured) {
    return saasApiErrorMessageOr(data, fallback);
  }

  const key = `apiErrors.${structured.code}`;
  const translated = t(key);
  const missingTranslation = translated === key;

  if (structured.code === "VALIDATION_ERROR" && structured.details.length > 0) {
    const base = missingTranslation ? structured.message : translated;
    const parts = structured.details.map((d) => {
      const path = d.path?.trim();
      if (path) return t("apiErrors.validationDetail", { path, message: d.message });
      return d.message;
    });
    return `${base} ${parts.join(" ")}`.trim();
  }

  if (!missingTranslation) return translated;
  return structured.message || fallback;
}
