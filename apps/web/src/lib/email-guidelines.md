# VBT Email Guidelines

This file defines conventions for all transactional/programmed emails.

## Required structure

- Use `buildVbtEmailHtml()` from `email-templates.ts`.
- Keep copy short: one main intent per email.
- Include exactly one primary CTA by default (`emailPrimaryButton()`), unless email is attachment-only.
- Add preheader text consistent with the subject.
- Use localized subject helpers from `email-config.ts`.

## Language rules

- Resolve locale from `User.emailLocale` whenever there is a user record.
- For batched deliveries (cron/group notifications), bucket recipients by locale and send one message per locale.
- Use `parseEmailLocale()` with fallback to `en`.

## Visual/brand rules

- Brand subtitle: `Vision Building Technologies`.
- Use logo from `${NEXT_PUBLIC_APP_URL}/brand/vision-logo.png` via template default.
- Keep table-based layout + inline styles for client compatibility (Gmail/Outlook/Apple Mail).
- Mobile behavior must remain readable at <= 640px width.

## Subject and content quality

- Subject must reflect the concrete event (not generic).
- Mention entity context when useful (org name, quote number, partner name).
- Avoid long paragraphs; target 2-4 short blocks max.
- CTA label must match destination action ("Open request", "Reset password", etc.).

## Security and safety

- Escape any user-provided text with `escapeHtml()`.
- Never include secrets or raw internal payloads in email bodies.
- For links, prefer app routes built from `NEXT_PUBLIC_APP_URL`.
