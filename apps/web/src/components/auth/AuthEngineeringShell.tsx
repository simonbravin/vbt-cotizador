"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useLanguage } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";

/**
 * Split auth layout: brand panel + form column (Apple-style, solid surfaces).
 */
export function AuthEngineeringShell({ children }: { children: ReactNode }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="relative flex min-h-screen flex-col bg-background lg:flex-row">
      <div className="absolute right-4 top-4 z-30 flex overflow-hidden rounded-full border border-border/80 bg-card shadow-none">
        {(["en", "es"] as Locale[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            className={`px-4 py-2 text-[12px] font-medium transition-colors ${
              locale === l
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {l === "en" ? "ENG" : "ESP"}
          </button>
        ))}
      </div>

      <aside className="relative z-10 flex flex-col justify-center border-b border-border/80 bg-header px-8 py-12 text-header-foreground lg:w-[42%] lg:min-h-screen lg:border-b-0 lg:border-r lg:px-12 lg:py-16">
        <div className="mx-auto w-full max-w-sm lg:mx-0">
          <div className="mb-10">
            <Image
              src="/logo-vbt-white.png"
              alt=""
              width={280}
              height={64}
              className="h-11 w-auto max-w-[220px] object-contain object-left opacity-95"
              priority
            />
          </div>
          <h1 className="font-display text-section-title text-header-foreground">{t("topbar.title")}</h1>
          <p className="mt-3 text-caption font-medium text-header-foreground/75">{t("auth.appSubtitle")}</p>
          <p className="mt-10 hidden border-t border-header-foreground/15 pt-8 text-[17px] leading-[1.47] tracking-[-0.374px] text-header-foreground/70 lg:block">
            {t("auth.shellTagline")}
          </p>
        </div>
      </aside>

      <main className="relative z-10 flex flex-1 flex-col justify-center px-6 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

/** Form panel — matches in-app surfaces */
export function AuthFormSurface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border/80 bg-card p-6 text-card-foreground sm:p-8 ${className}`.trim()}>
      {children}
    </div>
  );
}
