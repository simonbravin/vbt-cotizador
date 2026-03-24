import { requireModuleLayoutAccess } from "@/lib/module-layout-access";

export default async function EngineeringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModuleLayoutAccess("engineering");
  return <>{children}</>;
}

