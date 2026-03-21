import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { getResendFrom, parseEmailLocale, type EmailLocale } from "@/lib/email-config";

/** When true and RESEND_API_KEY is set, sends transactional emails for critical engineering events. */
export function isEngineeringEventEmailEnabled(): boolean {
  const v = process.env.SEND_ENGINEERING_EVENT_EMAILS?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COPY: Record<
  EmailLocale,
  {
    needsInfoSubject: (orgName: string) => string;
    needsInfoBody: (link: string, orgName: string) => string;
    deliveredSubject: (orgName: string) => string;
    deliveredBody: (link: string, orgName: string) => string;
    revisionSubject: (orgName: string) => string;
    revisionBody: (link: string, orgName: string, label: string) => string;
    noteSubject: (orgName: string) => string;
    noteBody: (link: string, orgName: string) => string;
    assignedSubject: string;
    assignedBody: (link: string, greeting: string) => string;
  }
> = {
  en: {
    needsInfoSubject: (org) => `[VBT Platform] Engineering needs information — ${org}`,
    needsInfoBody: (link, org) =>
      `<p>Your engineering request for <strong>${escapeHtml(org)}</strong> needs more information.</p><p><a href="${escapeHtml(link)}">Open request</a></p>`,
    deliveredSubject: (org) => `[VBT Platform] Engineering deliverable ready — ${org}`,
    deliveredBody: (link, org) =>
      `<p>A deliverable is ready for <strong>${escapeHtml(org)}</strong>.</p><p><a href="${escapeHtml(link)}">Open request</a></p>`,
    revisionSubject: (org) => `[VBT Platform] New engineering revision — ${org}`,
    revisionBody: (link, org, label) =>
      `<p>A new revision was uploaded for <strong>${escapeHtml(org)}</strong>: ${escapeHtml(label)}</p><p><a href="${escapeHtml(link)}">Open request</a></p>`,
    noteSubject: (org) => `[VBT Platform] Engineering update — ${org}`,
    noteBody: (link, org) =>
      `<p>There is a new note on your engineering request (<strong>${escapeHtml(org)}</strong>).</p><p><a href="${escapeHtml(link)}">Open request</a></p>`,
    assignedSubject: "[VBT Platform] Engineering request assigned to you",
    assignedBody: (link, greeting) =>
      `<p>Hi ${escapeHtml(greeting)},</p><p>An engineering request was assigned to you.</p><p><a href="${escapeHtml(link)}">Open in superadmin</a></p>`,
  },
  es: {
    needsInfoSubject: (org) => `[Plataforma VBT] Ingeniería necesita información — ${org}`,
    needsInfoBody: (link, org) =>
      `<p>Tu solicitud de ingeniería de <strong>${escapeHtml(org)}</strong> necesita más información.</p><p><a href="${escapeHtml(link)}">Abrir solicitud</a></p>`,
    deliveredSubject: (org) => `[Plataforma VBT] Entregable de ingeniería listo — ${org}`,
    deliveredBody: (link, org) =>
      `<p>Hay un entregable listo para <strong>${escapeHtml(org)}</strong>.</p><p><a href="${escapeHtml(link)}">Abrir solicitud</a></p>`,
    revisionSubject: (org) => `[Plataforma VBT] Nueva revisión de ingeniería — ${org}`,
    revisionBody: (link, org, label) =>
      `<p>Se subió una nueva revisión para <strong>${escapeHtml(org)}</strong>: ${escapeHtml(label)}</p><p><a href="${escapeHtml(link)}">Abrir solicitud</a></p>`,
    noteSubject: (org) => `[Plataforma VBT] Actualización de ingeniería — ${org}`,
    noteBody: (link, org) =>
      `<p>Hay una nota nueva en tu solicitud de ingeniería (<strong>${escapeHtml(org)}</strong>).</p><p><a href="${escapeHtml(link)}">Abrir solicitud</a></p>`,
    assignedSubject: "[Plataforma VBT] Solicitud de ingeniería asignada",
    assignedBody: (link, greeting) =>
      `<p>Hola ${escapeHtml(greeting)},</p><p>Se te asignó una solicitud de ingeniería.</p><p><a href="${escapeHtml(link)}">Abrir en superadmin</a></p>`,
  },
};

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
    const c = COPY[locale];
    let subject: string;
    let html: string;
    switch (input.event) {
      case "needs_info":
        subject = c.needsInfoSubject(orgName);
        html = c.needsInfoBody(partnerLink, orgName);
        break;
      case "delivered":
        subject = c.deliveredSubject(orgName);
        html = c.deliveredBody(partnerLink, orgName);
        break;
      case "revision":
        subject = c.revisionSubject(orgName);
        html = c.revisionBody(partnerLink, orgName, input.revisionLabel?.trim() || "revision");
        break;
      case "partner_note":
        subject = c.noteSubject(orgName);
        html = c.noteBody(partnerLink, orgName);
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
  const c = COPY[locale];
  const link = `${appBaseUrl()}/superadmin/engineering/${input.requestId}`;
  const greeting = user.fullName?.trim() || user.email;
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: getResendFrom(),
    to: user.email,
    subject: c.assignedSubject,
    html: c.assignedBody(link, greeting),
  });
}
