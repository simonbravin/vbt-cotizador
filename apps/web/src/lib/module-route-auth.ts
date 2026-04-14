import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, type SessionUser } from "@/lib/auth";
import { assertPartnerModuleEnabled, type PartnerModuleKey } from "@/lib/module-access";
import { jsonApiErrorResponse } from "@/lib/api-error";

type ModuleRouteAuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

/**
 * Standard auth gate for route handlers:
 * - requires signed-in user (401)
 * - enforces partner module visibility (403)
 */
export async function requireModuleRouteAuth(module: PartnerModuleKey): Promise<ModuleRouteAuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      ok: false,
      response: jsonApiErrorResponse(401, "UNAUTHORIZED", "You need to sign in."),
    };
  }
  const user = session.user as SessionUser;
  try {
    await assertPartnerModuleEnabled(module, user);
  } catch {
    return {
      ok: false,
      response: jsonApiErrorResponse(403, "FORBIDDEN", "You do not have permission for this action."),
    };
  }
  return { ok: true, user };
}

