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

const overlayClass = "fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4";
const contentClass = "bg-card text-card-foreground rounded-lg max-w-md w-full p-6 border border-border/80 shadow-none";

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
      ? "px-5 py-2.5 bg-destructive text-destructive-foreground rounded-full text-[17px] font-normal hover:opacity-90 disabled:opacity-50 border border-transparent"
      : "px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-[17px] font-normal hover:opacity-90 disabled:opacity-50 border border-transparent";

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
      <div className={contentClass} onClick={(e) => e.stopPropagation()}>
        <h3
          id="confirm-dialog-title"
          className="font-semibold text-lg mb-2 text-foreground tracking-[-0.02em]"
        >
          {title}
        </h3>
        <p id="confirm-dialog-desc" className="text-muted-foreground text-caption mb-5">
          {description}
        </p>
        {error && (
          <p
            className="text-caption text-destructive mb-5 border border-destructive/30 rounded-lg px-3 py-2 bg-destructive/5"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="flex gap-3 justify-end flex-wrap">
          <button
            type="button"
            onClick={() => !loading && onOpenChange(false)}
            disabled={loading}
            className="px-5 py-2.5 border border-border/80 rounded-full text-[17px] text-foreground hover:bg-muted disabled:opacity-50 font-normal"
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={handleConfirm} disabled={loading} className={confirmButtonClass}>
            {loading ? loadingLabel ?? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
