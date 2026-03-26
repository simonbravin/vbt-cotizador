import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Email clients open this link (GET); marks email verified and redirects to login. */
export async function GET(req: Request) {
  const base = appOrigin();
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(`${base}/login?error=verify_invalid`);
  }

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    return NextResponse.redirect(`${base}/login?error=verify_invalid`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.redirect(`${base}/login?verified=1`);
}
