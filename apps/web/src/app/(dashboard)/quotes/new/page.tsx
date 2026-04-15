import Link from "next/link";
import { ArrowLeft, FileText, ListOrdered } from "lucide-react";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/utils";
import { getT, LOCALE_COOKIE_NAME } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/translations";

export const dynamic = "force-dynamic";

type NewQuotePageProps = { searchParams?: { projectId?: string } };

export default async function NewQuotePage({ searchParams }: NewQuotePageProps) {
  await requireAuth();
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE_NAME)?.value === "es" ? "es" : "en") as Locale;
  const t = getT(locale);
  const projectId = searchParams?.projectId?.trim();
  const projectQuery = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";

  return (
    <div className="data-entry-page space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/quotes"
          className="p-2 rounded-lg border border-border/60 hover:bg-muted/40"
          aria-label={t("quotes.backToQuotes")}
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("quotes.newQuoteHubTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("quotes.newQuoteHubSubtitle")}</p>
          {projectId && (
            <p className="text-xs text-muted-foreground mt-1">{t("quotes.projectFixedFromLink")}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/quotes/wizard${projectQuery}`}
          className="surface-card group block p-5 transition-colors hover:border-primary/35 hover:bg-muted/20"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted">
              <ListOrdered className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-foreground">{t("quotes.startWizardAssistant")}</p>
              <p className="text-sm text-muted-foreground">{t("quotes.startWizardAssistantDesc")}</p>
            </div>
          </div>
        </Link>

        <Link
          href={`/quotes/create${projectQuery}`}
          className="surface-card group block p-5 transition-colors hover:border-primary/35 hover:bg-muted/20"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-foreground">{t("quotes.startQuickDraft")}</p>
              <p className="text-sm text-muted-foreground">{t("quotes.startQuickDraftDesc")}</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
