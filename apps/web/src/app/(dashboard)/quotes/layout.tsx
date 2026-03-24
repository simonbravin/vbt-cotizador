import { requireModuleLayoutAccess } from "@/lib/module-layout-access";

export default async function QuotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModuleLayoutAccess("quotes");
  return <>{children}</>;
}

