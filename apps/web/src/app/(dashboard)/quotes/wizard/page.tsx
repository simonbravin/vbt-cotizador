"use client";

import { Suspense } from "react";
import { useT } from "@/lib/i18n/context";
import { QuoteWizard } from "@/components/quotes/QuoteWizard";

function WizardLoading() {
  const t = useT();
  return (
    <div className="data-entry-page p-6">
      <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
    </div>
  );
}

export default function QuoteWizardPage() {
  return (
    <Suspense fallback={<WizardLoading />}>
      <QuoteWizard />
    </Suspense>
  );
}
