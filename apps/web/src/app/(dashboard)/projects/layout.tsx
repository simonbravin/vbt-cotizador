import { requireModuleLayoutAccess } from "@/lib/module-layout-access";

export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModuleLayoutAccess("projects");
  return <>{children}</>;
}

