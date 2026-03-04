import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    redirect("/login");
  }
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { id?: string; email?: string | null; name?: string | null; role?: string; orgId?: string | null; orgSlug?: string | null; status?: string };
  if (user.status === "PENDING") {
    redirect("/pending");
  }

  const safeUser = {
    name: user.name ?? null,
    email: user.email ?? null,
    role: typeof user.role === "string" ? user.role : "VIEWER",
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar role={safeUser.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={safeUser} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
