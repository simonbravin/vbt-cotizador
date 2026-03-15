/**
 * Central config for transactional emails (Resend).
 * All emails (quotes, invites, password reset, reports, etc.) use this address.
 * Set RESEND_FROM_EMAIL in env to override (default: admin@visionlatam.com).
 */
const DEFAULT_FROM = "Vision Latam <admin@visionlatam.com>";

export function getResendFrom(): string {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  return from || DEFAULT_FROM;
}

/** Subject lines for each email type (avoid generic "quotes" or wrong titles) */
export const EMAIL_SUBJECTS = {
  partnerInviteExisting: (partnerName: string) =>
    `You've been added to ${partnerName} – VBT Cotizador`,
  partnerInviteNewUser: (partnerName: string) =>
    `Invitation to join ${partnerName} – VBT Cotizador`,
  quote: (quoteNumber: string, projectName: string) =>
    `VBT Quote ${quoteNumber} – ${projectName}`,
  passwordReset: "VBT Cotizador – Reset your password",
  signupRequest: "VBT Cotizador – New account request",
  accountApproved: "VBT Cotizador – Account approved",
  accountRejected: "VBT Cotizador – Account not approved",
  report: "VBT Projects Report",
} as const;
