import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UsersClient } from "./UsersClient";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  const canChangeRole = user?.role === "SUPERADMIN";

  return <UsersClient canChangeRole={!!canChangeRole} />;
}
