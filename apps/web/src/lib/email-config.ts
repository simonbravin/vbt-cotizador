/**
 * Central config for transactional emails (Resend).
 * All emails (quotes, invites, password reset, reports, etc.) use this address.
 * Set RESEND_FROM_EMAIL in env to override (default: admin@visionlatam.com).
 *
 * Email *subjects* are localized with `EmailLocale` (`en` | `es`).
 * Preference is stored on `User.emailLocale` (set at signup; refined on password-reset).
 */
const DEFAULT_FROM = "Vision Latam <admin@visionlatam.com>";

export function getResendFrom(): string {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  return from || DEFAULT_FROM;
}

export type EmailLocale = "en" | "es";

export function parseEmailLocale(value: unknown): EmailLocale {
  return value === "es" ? "es" : "en";
}

const SUBJECTS = {
  en: {
    partnerInviteExisting: (partnerName: string) =>
      `Welcome to ${partnerName} — you're on VBT Platform`,
    partnerInviteNewUser: (partnerName: string) =>
      `Your invitation to join ${partnerName} is here`,
    quote: (quoteNumber: string, projectName: string) =>
      `Quote #${quoteNumber} · ${projectName}`,
    passwordReset: "Reset your password — secure link inside",
    signupRequest: "New account pending your review — VBT Platform",
    accountApproved: "You're approved — welcome to VBT Platform",
    accountRejected: "Update on your VBT Platform account request",
    report: "Your projects report is ready (CSV attached)",
    statements: "Your account statements are ready (PDF attached)",
    engineeringNeedsInfo: (orgName: string) =>
      `[VBT Platform] Engineering needs information — ${orgName}`,
    engineeringDelivered: (orgName: string) =>
      `[VBT Platform] Engineering deliverable ready — ${orgName}`,
    engineeringRevision: (orgName: string) =>
      `[VBT Platform] New engineering revision — ${orgName}`,
    engineeringNote: (orgName: string) =>
      `[VBT Platform] Engineering update — ${orgName}`,
    engineeringAssigned: "You have a new engineering request assigned",
    salesDueReminder: (orgName: string, count: number) =>
      `[VBT Platform] ${count} payment(s) due soon — ${orgName}`,
  },
  es: {
    partnerInviteExisting: (partnerName: string) =>
      `Bienvenido/a a ${partnerName} — Plataforma VBT`,
    partnerInviteNewUser: (partnerName: string) =>
      `Tu invitación para unirte a ${partnerName} ya está lista`,
    quote: (quoteNumber: string, projectName: string) =>
      `Cotización ${quoteNumber} · ${projectName}`,
    passwordReset: "Restablecé tu contraseña — enlace seguro dentro",
    signupRequest: "Nueva cuenta pendiente de revisión — Plataforma VBT",
    accountApproved: "Cuenta habilitada — bienvenido/a a Plataforma VBT",
    accountRejected: "Novedades sobre tu solicitud — Plataforma VBT",
    report: "Tu informe de proyectos está listo (CSV adjunto)",
    statements: "Tus estados de cuenta están listos (PDF adjunto)",
    engineeringNeedsInfo: (orgName: string) =>
      `[Plataforma VBT] Ingeniería necesita información — ${orgName}`,
    engineeringDelivered: (orgName: string) =>
      `[Plataforma VBT] Entregable de ingeniería listo — ${orgName}`,
    engineeringRevision: (orgName: string) =>
      `[Plataforma VBT] Nueva revisión de ingeniería — ${orgName}`,
    engineeringNote: (orgName: string) =>
      `[Plataforma VBT] Actualización de ingeniería — ${orgName}`,
    engineeringAssigned: "Tenés una solicitud de ingeniería asignada",
    salesDueReminder: (orgName: string, count: number) =>
      `[Plataforma VBT] ${count} pago(s) próximos a vencer — ${orgName}`,
  },
} as const;

export function emailSubjectPartnerInviteExisting(locale: EmailLocale, partnerName: string): string {
  return SUBJECTS[locale].partnerInviteExisting(partnerName);
}

export function emailSubjectPartnerInviteNewUser(locale: EmailLocale, partnerName: string): string {
  return SUBJECTS[locale].partnerInviteNewUser(partnerName);
}

export function emailSubjectQuote(locale: EmailLocale, quoteNumber: string, projectName: string): string {
  return SUBJECTS[locale].quote(quoteNumber, projectName);
}

export function emailSubjectPasswordReset(locale: EmailLocale): string {
  return SUBJECTS[locale].passwordReset;
}

export function emailSubjectSignupRequest(locale: EmailLocale = "en"): string {
  return SUBJECTS[locale].signupRequest;
}

export function emailSubjectAccountApproved(locale: EmailLocale): string {
  return SUBJECTS[locale].accountApproved;
}

export function emailSubjectAccountRejected(locale: EmailLocale): string {
  return SUBJECTS[locale].accountRejected;
}

export function emailSubjectReport(locale: EmailLocale): string {
  return SUBJECTS[locale].report;
}

export function emailSubjectStatements(locale: EmailLocale): string {
  return SUBJECTS[locale].statements;
}

export function emailSubjectEngineeringNeedsInfo(locale: EmailLocale, orgName: string): string {
  return SUBJECTS[locale].engineeringNeedsInfo(orgName);
}

export function emailSubjectEngineeringDelivered(locale: EmailLocale, orgName: string): string {
  return SUBJECTS[locale].engineeringDelivered(orgName);
}

export function emailSubjectEngineeringRevision(locale: EmailLocale, orgName: string): string {
  return SUBJECTS[locale].engineeringRevision(orgName);
}

export function emailSubjectEngineeringNote(locale: EmailLocale, orgName: string): string {
  return SUBJECTS[locale].engineeringNote(orgName);
}

export function emailSubjectEngineeringAssigned(locale: EmailLocale): string {
  return SUBJECTS[locale].engineeringAssigned;
}

export function emailSubjectSalesDueReminder(
  locale: EmailLocale,
  orgName: string,
  count: number
): string {
  return SUBJECTS[locale].salesDueReminder(orgName, count);
}
