"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useLanguage } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";

/**
 * Split auth layout: system identity (left) + form column (right).
 * Full-viewport blueprint grid; left strip matches dashboard header chrome.
 */
export function AuthEngineeringShell({ children }: { children: ReactNode }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background blueprint-canvas relative">
      <div className="absolute top-4 right-4 z-30 flex rounded-sm border border-border/60 overflow-hidden bg-background/90 text-xs font-semibold tracking-wide">
        {(["en", "es"] as Locale[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            className={`px-3 py-2 transition-colors ${
              locale === l
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            {l === "en" ? "ENG" : "ESP"}
          </button>
        ))}
      </div>

      <aside className="relative z-10 lg:w-[42%] lg:min-h-screen flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-border/60 bg-header px-8 py-12 lg:px-12 lg:py-16 text-header-foreground">
        <div className="max-w-sm mx-auto lg:mx-0 w-full">
          <div className="mb-8">
            <Image
              src="/logo-vbt-white.png"
              alt=""
              width={280}
              height={64}
              className="h-11 w-auto max-w-[220px] object-contain object-left opacity-95"
              priority
            />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-header-foreground">{t("topbar.title")}</h1>
          <p className="mt-2 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-header-foreground/75">
            {t("auth.appSubtitle")}
          </p>
          <p className="mt-8 text-sm text-header-foreground/70 leading-relaxed border-t border-header-foreground/15 pt-6 hidden lg:block">
            {t("auth.shellTagline")}
          </p>
        </div>
      </aside>

      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 lg:py-16">
        <div className="w-full max-w-md mx-auto">{children}</div>
      </main>
    </div>
  );
}

/** Bordered form surface — no shadow, matches dashboard panels */
export function AuthFormSurface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-sm border border-border/60 bg-background p-6 sm:p-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
