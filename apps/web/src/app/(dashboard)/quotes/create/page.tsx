import { redirect } from "next/navigation";

/** Quick draft UI removed; all partner quote creation goes through the wizard. */
export default function CreateQuoteRedirectPage({
  searchParams,
}: {
  searchParams?: { projectId?: string };
}) {
  const pid = searchParams?.projectId?.trim();
  redirect(pid ? `/quotes/wizard?projectId=${encodeURIComponent(pid)}` : "/quotes/wizard");
}
