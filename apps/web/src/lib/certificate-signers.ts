/**
 * Firmantes fijos en certificados de capacitación (PDF y plantillas alineados a este texto).
 *
 * Firmas manuscritas en PNG: es habitual **no** versionarlas en el repo (copiables como cualquier imagen web).
 * Lo más frecuente en certificados de curso es línea + nombre y cargo tipográficos; la autenticidad la aporta
 * el código/QR de verificación. Firmas criptográficas en PDF (certificado digital) es otro flujo, aparte.
 */
export const CERTIFICATE_ISSUED_BY = {
  name: "Simon Bravin",
  title: "Gerente comercial",
} as const;

export const CERTIFICATE_AUTHORIZED_BY = {
  name: "Leonardo Bravin",
  title: "Presidente · Vision Latam S.A.",
} as const;
