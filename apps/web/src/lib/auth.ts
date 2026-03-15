import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@vbt/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { OrgMemberRole } from "@vbt/db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Superadmin email – set SUPERADMIN_EMAIL in env to override. Only this user (or DB is_platform_superadmin) gets superadmin. */
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? "admin@visionbuildingtechs.com";

type RawUserRow = {
  id: string;
  email: string;
  passwordHash: string;
  isActive?: boolean;
  isPlatformSuperadmin?: boolean;
};

/** When Prisma findUnique throws (e.g. column names differ in Neon), try raw queries. */
async function loginRawFallback(
  emailNorm: string
): Promise<{
  id: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  isPlatformSuperadmin: boolean;
  orgMembers: Array<{ organization: { id: string; name: string }; role: string }>;
} | null> {
  let row: RawUserRow | null = null;

  try {
    const rows = await prisma.$queryRaw<(RawUserRow & { is_active?: boolean; is_platform_superadmin?: boolean })[]>`
      SELECT id, email, password_hash AS "passwordHash", is_active, is_platform_superadmin
      FROM users
      WHERE LOWER(email) = LOWER(${emailNorm})
      LIMIT 1
    `;
    if (rows[0]) {
      const r = rows[0];
      const fromDb = r.is_active !== false; // treat undefined/null as true
      const superadminFromDb = r.is_platform_superadmin === true;
      const superadminFromEmail = r.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
      row = { ...r, isActive: fromDb, isPlatformSuperadmin: superadminFromDb || superadminFromEmail };
    }
  } catch {
    // Columns is_active / is_platform_superadmin may not exist in some DBs; use minimal select and email-based superadmin
    try {
      const rows = await prisma.$queryRaw<RawUserRow[]>`
        SELECT id, email, password_hash AS "passwordHash"
        FROM users
        WHERE LOWER(email) = LOWER(${emailNorm})
        LIMIT 1
      `;
      if (rows[0]) {
        const emailMatch = rows[0].email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
        row = { ...rows[0], isActive: true, isPlatformSuperadmin: emailMatch };
      }
    } catch {
      return null;
    }
  }
  if (!row) return null;

  if (!row) return null;

  let orgMembers: Array<{ organization: { id: string; name: string }; role: string }> = [];
  try {
    const members = await prisma.orgMember.findMany({
      where: { userId: row.id, status: "active" },
      include: { organization: true },
      orderBy: { joinedAt: "asc" },
    });
    orgMembers = members.map((m) => ({
      organization: { id: m.organization.id, name: m.organization.name },
      role: m.role,
    }));
  } catch {
    // Org table may differ; continue without org
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    isActive: row.isActive ?? true,
    isPlatformSuperadmin: row.isPlatformSuperadmin ?? row.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase(),
    orgMembers,
  };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const emailNorm = email.toLowerCase().trim();

        let user: {
          id: string;
          email: string;
          passwordHash: string;
          isActive: boolean;
          isPlatformSuperadmin: boolean;
          orgMembers: Array<{ organization: { id: string; name: string }; role: string }>;
        } | null = null;

        try {
          user = await prisma.user.findUnique({
            where: { email: emailNorm },
            select: {
              id: true,
              email: true,
              passwordHash: true,
              isActive: true,
              isPlatformSuperadmin: true,
              orgMembers: {
                where: { status: "active" },
                include: { organization: true },
                orderBy: { joinedAt: "asc" },
              },
            },
          });
        } catch (err) {
          // Prisma may throw if columns don't match (e.g. Neon has "name" not "full_name", "passwordHash" not "password_hash")
          const row = await loginRawFallback(emailNorm);
          if (row) user = row;
        }

        if (!user) return null;
        // Never block: configured superadmin email (SUPERADMIN_EMAIL) or DB is_platform_superadmin; only block when explicitly inactive
        const isSuperadmin =
          user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase() || user.isPlatformSuperadmin === true;
        if (user.isActive === false && !isSuperadmin) {
          throw new Error("PENDING");
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const activeMembership = user.orgMembers[0];

        return {
          id: user.id,
          email: user.email,
          name: user.email,
          activeOrgId: activeMembership?.organization.id ?? null,
          activeOrgName: activeMembership?.organization.name ?? null,
          role: (activeMembership?.role ?? "viewer") as string,
          isPlatformSuperadmin: user.isPlatformSuperadmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.activeOrgId = (user as any).activeOrgId;
        token.activeOrgName = (user as any).activeOrgName;
        token.role = (user as any).role;
        token.isPlatformSuperadmin = (user as any).isPlatformSuperadmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).userId = token.id;
        (session.user as any).activeOrgId = token.activeOrgId ?? null;
        (session.user as any).activeOrgName = token.activeOrgName ?? null;
        (session.user as any).role = token.role ?? "viewer";
        (session.user as any).roles = token.role ? [token.role] : [];
        // Single source of truth: isPlatformSuperadmin is set once in authorize and stored in JWT
        (session.user as any).isPlatformSuperadmin = token.isPlatformSuperadmin === true;
        // Backward compat for existing UI that expects orgId
        (session.user as any).orgId = token.activeOrgId ?? null;
        (session.user as any).orgSlug = token.activeOrgName ?? null;
      }
      return session;
    },
  },
};

/**
 * Session user shape for Partner SaaS.
 * - userId: same as id (for clarity in tenant helpers).
 * - activeOrgId: organization scope for this session (null if no org membership).
 * - role: role in the active organization (org_admin | sales_user | technical_user | viewer).
 * - roles: array with the active org role (for compatibility; one active org per session).
 * - isPlatformSuperadmin: can access all tenants and manage permissions.
 */
export type SessionUser = {
  id: string;
  userId: string;
  email: string;
  name?: string | null;
  activeOrgId: string | null;
  activeOrgName?: string | null;
  role: OrgMemberRole | string;
  roles: string[];
  isPlatformSuperadmin: boolean;
  /** @deprecated Use activeOrgId */
  orgId?: string | null;
  /** @deprecated Use activeOrgName */
  orgSlug?: string | null;
};
