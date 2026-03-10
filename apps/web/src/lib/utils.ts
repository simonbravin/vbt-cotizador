import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getServerSession } from "next-auth";
import { authOptions, type SessionUser } from "./auth";
import { redirect } from "next/navigation";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session.user as SessionUser;
}

export async function requireRole(
  allowedRoles: string[]
): Promise<SessionUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes((user as any).role)) {
    redirect("/dashboard");
  }
  return user;
}

/** Parse JSON from fetch response text; returns fallback on empty or invalid. */
export function parseJsonSafe<T = Record<string, unknown>>(text: string, fallback: T = {} as T): T {
  if (!text?.trim()) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

export function generateQuoteNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `VBT-${year}${month}-${rand}`;
}
