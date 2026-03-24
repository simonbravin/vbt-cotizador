import { requireModuleLayoutAccess } from "@/lib/module-layout-access";

export default async function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModuleLayoutAccess("documents");
  return <>{children}</>;
}

