import { redirect } from "next/navigation";

/** Legacy hub URL; canonical new-quote flow is the wizard. */
export default function NewQuoteRedirectPage({
  searchParams,
}: {
  searchParams?: { projectId?: string };
}) {
  const pid = searchParams?.projectId?.trim();
  redirect(pid ? `/quotes/wizard?projectId=${encodeURIComponent(pid)}` : "/quotes/wizard");
}
