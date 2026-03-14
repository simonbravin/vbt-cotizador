import crypto from "crypto";

const EXPIRY_SECONDS = 60 * 60; // 1 hour

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Buffer {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  return Buffer.from(padded, "base64");
}

export type ResetTokenPayload = {
  userId: string;
  email: string;
  exp: number;
};

export function createPasswordResetToken(userId: string, email: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for password reset tokens");
  const exp = Math.floor(Date.now() / 1000) + EXPIRY_SECONDS;
  const payload: ResetTokenPayload = { userId, email, exp };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(Buffer.from(payloadStr, "utf8"));
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

export function verifyPasswordResetToken(token: string): ResetTokenPayload | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  try {
    const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest();
    const expectedSigB64 = base64UrlEncode(sig);
    if (sigB64 !== expectedSigB64) return null;
    const payloadBuf = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadBuf.toString("utf8")) as ResetTokenPayload;
    if (!payload.userId || !payload.email || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
