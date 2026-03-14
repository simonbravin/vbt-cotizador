import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UsersClient } from "@/app/(dashboard)/admin/users/UsersClient";

export default async function SuperadminUsersPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  const canChangeRole = user?.role === "SUPERADMIN" || (user as { isPlatformSuperadmin?: boolean })?.isPlatformSuperadmin === true;

  return <UsersClient canChangeRole={!!canChangeRole} />;
}
