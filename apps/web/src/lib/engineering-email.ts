import { Resend } from "resend";
import { prisma } from "@/lib/db";
import {
  emailSubjectEngineeringAssigned,
  emailSubjectEngineeringDelivered,
  emailSubjectEngineeringNeedsInfo,
  emailSubjectEngineeringNote,
  emailSubjectEngineeringRevision,
  getResendFrom,
  parseEmailLocale,
  type EmailLocale,
} from "@/lib/email-config";
import {
  buildEngineeringAssignedEmailHtml,
  buildEngineeringEventEmailHtml,
} from "@/lib/email-bodies";

/** When true and RESEND_API_KEY is set, sends transactional emails for critical engineering events. */
export function isEngineeringEventEmailEnabled(): boolean {
  const v = process.env.SEND_ENGINEERING_EVENT_EMAILS?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

async function activePartnerRecipientEmails(organizationId: string): Promise<
  Array<{ email: string; locale: EmailLocale }>
> {
  const members = await prisma.orgMember.findMany({
    where: {
      organizationId,
      status: "active",
      role: { in: ["org_admin", "technical_user", "sales_user"] },
    },
    include: { user: { select: { email: true, isActive: true, emailLocale: true } } },
  });
  return members
    .filter((m) => m.user.isActive && m.user.email)
    .map((m) => ({
      email: m.user.email!,
      locale: parseEmailLocale(m.user.emailLocale),
    }));
}

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Notify partner org (admins / technical / sales) about a critical engineering event. No-op if disabled or no API key. */
export async function sendPartnerEngineeringEventEmail(input: {
  organizationId: string;
  event: "needs_info" | "delivered" | "revision" | "partner_note";
  requestId: string;
  revisionLabel?: string;
}): Promise<void> {
  if (!isEngineeringEventEmailEnabled() || !process.env.RESEND_API_KEY) return;

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { name: true },
  });
  const orgName = org?.name ?? "Partner";
  const recipients = await activePartnerRecipientEmails(input.organizationId);
  if (recipients.length === 0) return;

  const partnerLink = `${appBaseUrl()}/engineering/${input.requestId}`;
  const resend = new Resend(process.env.RESEND_API_KEY);

  // One send per locale bucket to keep subject/body consistent
  const byLocale = new Map<EmailLocale, string[]>();
  for (const r of recipients) {
    const list = byLocale.get(r.locale) ?? [];
    list.push(r.email);
    byLocale.set(r.locale, list);
  }

  for (const [locale, emails] of byLocale) {
    let subject: string;
    let html: string;
    switch (input.event) {
      case "needs_info":
        subject = emailSubjectEngineeringNeedsInfo(locale, orgName);
        html = buildEngineeringEventEmailHtml(locale, {
          event: "needs_info",
          orgName,
          requestUrl: partnerLink,
        });
        break;
      case "delivered":
        subject = emailSubjectEngineeringDelivered(locale, orgName);
        html = buildEngineeringEventEmailHtml(locale, {
          event: "delivered",
          orgName,
          requestUrl: partnerLink,
        });
        break;
      case "revision":
        subject = emailSubjectEngineeringRevision(locale, orgName);
        html = buildEngineeringEventEmailHtml(locale, {
          event: "revision",
          orgName,
          requestUrl: partnerLink,
          revisionLabel: input.revisionLabel?.trim() || undefined,
        });
        break;
      case "partner_note":
        subject = emailSubjectEngineeringNote(locale, orgName);
        html = buildEngineeringEventEmailHtml(locale, {
          event: "partner_note",
          orgName,
          requestUrl: partnerLink,
        });
        break;
      default:
        return;
    }
    const to = emails[0];
    const bcc = emails.length > 1 ? emails.slice(1) : undefined;
    await resend.emails.send({ from: getResendFrom(), to, bcc, subject, html });
  }
}

/** Notify the newly assigned platform user (superadmin queue). */
export async function sendEngineeringAssigneeEmail(input: {
  assigneeUserId: string;
  requestId: string;
}): Promise<void> {
  if (!isEngineeringEventEmailEnabled() || !process.env.RESEND_API_KEY) return;

  const user = await prisma.user.findUnique({
    where: { id: input.assigneeUserId },
    select: { email: true, isActive: true, fullName: true, emailLocale: true },
  });
  if (!user?.isActive || !user.email) return;

  const locale = parseEmailLocale(user.emailLocale);
  const link = `${appBaseUrl()}/superadmin/engineering/${input.requestId}`;
  const greeting = user.fullName?.trim() || user.email;
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: getResendFrom(),
    to: user.email,
    subject: emailSubjectEngineeringAssigned(locale),
    html: buildEngineeringAssignedEmailHtml(locale, { requestUrl: link, greeting }),
  });
}
