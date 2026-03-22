"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export type ConfirmDialogVariant = "danger" | "primary";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Shown on confirm button when loading is true */
  loadingLabel?: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  /** Optional error message to show below description */
  error?: string | null;
}

const overlayClass =
  "fixed inset-0 bg-black/65 z-[9999] flex items-center justify-center p-4";
const contentClass =
  "bg-background rounded-sm max-w-md w-full p-6 border border-border/60 ring-1 ring-border/60";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  loadingLabel,
  onConfirm,
  loading = false,
  error = null,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onOpenChange(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open, loading, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  const confirmButtonClass =
    variant === "danger"
      ? "px-4 py-2 bg-destructive text-destructive-foreground rounded-sm text-sm font-semibold hover:opacity-90 disabled:opacity-50 border border-destructive/30"
      : "px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm font-semibold hover:opacity-90 disabled:opacity-50 border border-primary/20";

  return createPortal(
    <div
      className={overlayClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onOpenChange(false);
      }}
    >
      <div
        className={contentClass}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="font-semibold text-lg mb-2 text-foreground tracking-tight">
          {title}
        </h3>
        <p id="confirm-dialog-desc" className="text-muted-foreground text-sm mb-4">
          {description}
        </p>
        {error && (
          <p className="text-sm text-destructive mb-4 border border-destructive/25 rounded-sm px-2 py-1.5 bg-destructive/5" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => !loading && onOpenChange(false)}
            disabled={loading}
            className="px-4 py-2 border border-border/60 rounded-sm text-sm text-foreground hover:bg-muted disabled:opacity-50 font-medium"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={confirmButtonClass}
          >
            {loading ? loadingLabel ?? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
