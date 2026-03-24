import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, type SessionUser } from "@/lib/auth";
import { getEffectiveActiveOrgId } from "@/lib/tenant";
import { assertPartnerModuleEnabled, type PartnerModuleKey } from "@/lib/module-access";

type Options = {
  allowRoles?: string[];
};

export async function requireModuleLayoutAccess(module: PartnerModuleKey, options: Options = {}): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  if (options.allowRoles && !user.isPlatformSuperadmin) {
    const role = user.role ?? "viewer";
    if (!options.allowRoles.includes(role)) {
      redirect("/dashboard");
    }
  }

  const activeOrgId = await getEffectiveActiveOrgId(user);
  try {
    await assertPartnerModuleEnabled(module, {
      activeOrgId,
      isPlatformSuperadmin: !!user.isPlatformSuperadmin,
    });
  } catch {
    redirect("/dashboard");
  }

  return user;
}

