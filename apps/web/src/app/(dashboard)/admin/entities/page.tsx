import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EntitiesClient } from "./EntitiesClient";

export default async function EntitiesPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }
  return <EntitiesClient />;
}
