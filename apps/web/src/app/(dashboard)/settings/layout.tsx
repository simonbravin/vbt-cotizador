import { requireModuleLayoutAccess } from "@/lib/module-layout-access";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModuleLayoutAccess("settings", {
    allowRoles: ["org_admin"],
  });
  return <>{children}</>;
}
