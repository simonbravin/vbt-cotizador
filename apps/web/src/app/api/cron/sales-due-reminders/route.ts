import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listDueInvoiceItems } from "@/lib/partner-sales";
import { Resend } from "resend";
import { emailSubjectSalesDueReminder, getResendFrom, parseEmailLocale } from "@/lib/email-config";
import { buildSalesDueReminderEmailHtml } from "@/lib/email-bodies";

/**
 * Vercel Cron or manual: GET with Authorization: Bearer CRON_SECRET
 * Sends one digest email per org to active org_admin addresses when there are invoices due in the next 7 days.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") ?? "";
  const vercelCron = process.env.VERCEL === "1" && req.headers.get("x-vercel-cron") === "1";
  const bearerOk = !!secret && auth === `Bearer ${secret}`;
  if (!vercelCron && !bearerOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });
  }

  const orgs = await prisma.organization.findMany({
    where: { status: "active" },
    select: { id: true, name: true },
  });

  const resend = new Resend(apiKey);
  const from = getResendFrom();
  let emailsSent = 0;

  for (const org of orgs) {
    const { count, invoices } = await listDueInvoiceItems(org.id, 7);
    if (count === 0) continue;

    const admins = await prisma.orgMember.findMany({
      where: { organizationId: org.id, status: "active", role: "org_admin" },
      include: { user: { select: { email: true, isActive: true, emailLocale: true } } },
    });
    const recipients = admins
      .filter((m) => m.user.isActive && m.user.email)
      .map((m) => ({
        email: m.user.email as string,
        locale: parseEmailLocale(m.user.emailLocale),
      }));
    if (recipients.length === 0) continue;

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.visionlatam.com").replace(/\/$/, "");
    const statementsUrl = `${baseUrl}/sales/statements`;

    const byLocale = new Map<"en" | "es", string[]>();
    for (const r of recipients) {
      const list = byLocale.get(r.locale) ?? [];
      list.push(r.email);
      byLocale.set(r.locale, list);
    }

    for (const [locale, emails] of byLocale.entries()) {
      const html = buildSalesDueReminderEmailHtml(locale, {
        orgName: org.name,
        count,
        invoices,
        statementsUrl,
      });
      const { error } = await resend.emails.send({
        from,
        to: emails[0],
        bcc: emails.length > 1 ? emails.slice(1) : undefined,
        subject: emailSubjectSalesDueReminder(locale, org.name, count),
        html,
      });
      if (!error) emailsSent += 1;
      else console.error("[cron/sales-due-reminders]", org.id, locale, error);
    }
  }

  return NextResponse.json({ ok: true, orgsChecked: orgs.length, emailsSent });
}
