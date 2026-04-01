"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Clock } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { AuthEngineeringShell, AuthFormSurface } from "@/components/auth/AuthEngineeringShell";
import { Button } from "@/components/ui/button";

export function PendingContent({ supportEmail }: { supportEmail: string }) {
  const t = useT();

  return (
    <AuthEngineeringShell>
      <AuthFormSurface className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg border border-border/60 bg-muted/40 text-muted-foreground mb-5">
          <Clock className="w-6 h-6" strokeWidth={1.5} aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-foreground tracking-tight mb-2">{t("auth.pendingTitle")}</h2>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{t("auth.pendingMsg")}</p>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{t("auth.pendingAssignment")}</p>
        <p className="text-xs font-mono text-muted-foreground mb-8">
          {t("auth.needUrgentAccess")}{" "}
          <a href={`mailto:${supportEmail}`} className="text-primary hover:underline underline-offset-2">
            {supportEmail}
          </a>
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 border-t border-border/60">
          <Button variant="outline" asChild className="border-border/60">
            <Link href="/login">← {t("auth.signInLink")}</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            {t("auth.signOut")}
          </Button>
        </div>
      </AuthFormSurface>
    </AuthEngineeringShell>
  );
}
