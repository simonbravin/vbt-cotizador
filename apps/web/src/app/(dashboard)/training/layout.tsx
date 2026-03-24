import { requireModuleLayoutAccess } from "@/lib/module-layout-access";

export default async function TrainingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModuleLayoutAccess("training");
  return <>{children}</>;
}

