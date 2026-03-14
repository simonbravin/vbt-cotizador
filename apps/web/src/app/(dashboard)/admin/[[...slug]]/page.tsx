import { redirect } from "next/navigation";

/**
 * Catch-all for /admin/* when no specific page exists.
 * Superadmins are redirected to /superadmin/admin/* by middleware before reaching here.
 * Non-superadmins are redirected to /dashboard by the parent layout.
 * This page handles any remaining edge case (e.g. /admin with no segment).
 */
export default function AdminCatchAllPage() {
  redirect("/dashboard");
}
