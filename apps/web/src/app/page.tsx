import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  const user = session.user as { isPlatformSuperadmin?: boolean };
  // Superadmin always → superadmin portal; everyone else → partner dashboard
  if (user?.isPlatformSuperadmin) {
    redirect("/superadmin/dashboard");
  }
  redirect("/dashboard");
}
