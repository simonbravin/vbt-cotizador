import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { buildVbtEmailHtml, escapeHtml, VBT_EMAIL } from "@/lib/email-templates";
import { z } from "zod";
import crypto from "crypto";

const bodySchema = z.object({
  email: z.string().email("Invalid email address"),
});

const TOKEN_EXPIRY_HOURS = 1;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    // Always return success to avoid email enumeration
    if (!user) {
      return NextResponse.json({ ok: true, message: "If that email exists, we sent a reset link." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const html = buildVbtEmailHtml({
          title: "Reset your password",
          subtitle: "Vision Building Technologies",
          bodyHtml: `
            <p style="margin: 0 0 12px 0;">Hi ${escapeHtml(user.fullName)},</p>
            <p style="margin: 0 0 16px 0;">You requested a password reset. Click the link below to set a new password. This link expires in ${TOKEN_EXPIRY_HOURS} hour(s).</p>
            <p style="margin: 0 0 16px 0;"><a href="${escapeHtml(resetUrl)}" style="color: ${VBT_EMAIL.accent}; font-weight: 600;">Reset password</a></p>
            <p style="margin: 0; color: #666; font-size: 13px;">If you didn't request this, you can ignore this email.</p>
          `.trim(),
          footerText: "This notification was sent by the VBT Cotizador.",
        });
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "noreply@visionlatam.com",
          to: user.email,
          subject: "VBT Cotizador – Reset your password",
          html,
        });
      } catch (emailErr) {
        console.warn("Failed to send password reset email:", emailErr);
        await prisma.passwordResetToken.deleteMany({ where: { token } });
        return NextResponse.json(
          { error: "Failed to send email. Try again later or contact support." },
          { status: 503 }
        );
      }
    } else {
      // No Resend: remove token so it can't be used; inform user
      await prisma.passwordResetToken.deleteMany({ where: { token } });
      return NextResponse.json(
        { error: "Password reset emails are not configured. Contact an administrator." },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, message: "If that email exists, we sent a reset link." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
